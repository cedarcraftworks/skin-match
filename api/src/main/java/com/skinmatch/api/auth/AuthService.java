package com.skinmatch.api.auth;

import com.skinmatch.api.web.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 登録・ログイン・ログアウトとトークンの確認。
 *
 * <p>トークンはランダムな 32 バイト。データベースには SHA-256 のハッシュだけを保存するので、
 * データベースが漏れてもそのままでは使えない。パスワードは BCrypt でハッシュ化する。
 */
@Service
public class AuthService {

    private final JdbcClient db;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();
    private final Duration sessionLength;
    private final Clock clock;

    record UserRow(long id, String passwordHash) {}

    public AuthService(JdbcClient db, AppProperties props) {
        this.db = db;
        this.sessionLength = Duration.ofDays(props.sessionDays());
        this.clock = Clock.systemUTC();
    }

    @Transactional
    public String register(String email, String password) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        long userId;
        try {
            userId = db.sql("INSERT INTO users (email, password_hash) VALUES (:email, :hash) RETURNING id")
                    .param("email", normalized)
                    .param("hash", encoder.encode(password))
                    .query(Long.class)
                    .single();
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "このメールアドレスはすでに登録されています");
        }
        return issueToken(userId);
    }

    @Transactional
    public String login(String email, String password) {
        Optional<UserRow> user = db.sql("SELECT id, password_hash FROM users WHERE email = :email")
                .param("email", email.trim().toLowerCase(Locale.ROOT))
                .query(UserRow.class)
                .optional();
        // メールアドレスが違うのかパスワードが違うのかは、どちらも同じ返事にする
        if (user.isEmpty() || !encoder.matches(password, user.get().passwordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "メールアドレスかパスワードが違います");
        }
        return issueToken(user.get().id());
    }

    public void logout(String token) {
        db.sql("DELETE FROM sessions WHERE token_hash = :hash").param("hash", hash(token)).update();
    }

    /** 有効なトークンなら利用者の id を返す。 */
    public Optional<Long> userIdFor(String token) {
        return db.sql("SELECT user_id FROM sessions WHERE token_hash = :hash AND expires_at > :now")
                .param("hash", hash(token))
                .param("now", OffsetDateTime.now(clock))
                .query(Long.class)
                .optional();
    }

    private String issueToken(long userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.sql("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (:hash, :user, :expires)")
                .param("hash", hash(token))
                .param("user", userId)
                .param("expires", OffsetDateTime.now(clock).plus(sessionLength))
                .update();
        return token;
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
