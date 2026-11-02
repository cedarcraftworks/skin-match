package com.skinmatch.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Authorization: Bearer &lt;token&gt; を確認し、利用者の id をリクエストに付ける。
 * コントローラーは @RequestAttribute("userId") で受け取り、その人のデータだけを扱う。
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String USER_ID = "userId";
    private static final String PREFIX = "Bearer ";

    private final AuthService auth;

    public AuthInterceptor(AuthService auth) {
        this.auth = auth;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true; // CORS の事前確認
        }
        Optional<Long> userId = tokenOf(request).flatMap(auth::userIdFor);
        if (userId.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\":\"ログインしてください\"}");
            return false;
        }
        request.setAttribute(USER_ID, userId.get());
        return true;
    }

    static Optional<String> tokenOf(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(PREFIX) || header.length() == PREFIX.length()) {
            return Optional.empty();
        }
        return Optional.of(header.substring(PREFIX.length()).trim());
    }
}
