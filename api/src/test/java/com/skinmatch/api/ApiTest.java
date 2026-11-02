package com.skinmatch.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinmatch.api.analyzer.AnalyzerClient;
import com.skinmatch.api.analyzer.AnalyzerClient.Judgement;
import com.skinmatch.api.analyzer.AnalyzerClient.UsageResult;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * API を通しで確かめる。データベースは Testcontainers で起動した本物の PostgreSQL を使い、
 * Python の判定サービスだけを差し替える。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ApiTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean AnalyzerClient analyzer;

    private static final Judgement EMPTY = new Judgement(0, 0, true, List.of(), List.of(), List.of(), List.of());

    @BeforeEach
    void analyzerSplitsOnCommas() {
        // 本物の判定サービスの代わりに、読点で区切るだけの簡単な整理をする
        when(analyzer.normalize(anyString()))
                .thenAnswer(inv -> Arrays.stream(inv.<String>getArgument(0).split("、"))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList());
        when(analyzer.judge(anyList(), anyList())).thenReturn(EMPTY);
        when(analyzer.insights(anyList())).thenReturn(EMPTY);
    }

    @Test
    void healthNeedsNoLogin() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok"));
    }

    @Test
    void apiDocsAndHealthCheckNeedNoLogin() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("肌に合う次の一本 API"))
                .andExpect(jsonPath("$.paths['/api/judge']").exists());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void everythingElseNeedsLogin() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/products").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("ログインしてください"));
    }

    @Test
    void registerLoginAndLogout() throws Exception {
        String email = uniqueEmail();
        register(email);

        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, "password123")))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, "wrong-password")))
                .andExpect(status().isUnauthorized());

        String token = login(email);
        mvc.perform(get("/api/products").header("Authorization", bearer(token))).andExpect(status().isOk());

        mvc.perform(post("/api/auth/logout").header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/products").header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shortPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(uniqueEmail(), "short")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createProductAndRecordUsage() throws Exception {
        String token = register(uniqueEmail());
        long id = createProduct(token, "うるおい化粧水", "水、BG、セラミドNP");

        mvc.perform(get("/api/products/" + id).header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ingredients[0]").value("水"))
                .andExpect(jsonPath("$.ingredients[2]").value("セラミドNP"))
                .andExpect(jsonPath("$.latestResult").doesNotExist());

        mvc.perform(post("/api/products/" + id + "/usages").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startedOn\":\"2026-10-01\",\"endedOn\":\"2026-10-28\",\"result\":\"good\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.latestResult").value("good"))
                .andExpect(jsonPath("$.usages.length()").value(1));
    }

    @Test
    void endDateBeforeStartIsRejected() throws Exception {
        String token = register(uniqueEmail());
        long id = createProduct(token, "化粧水", "水、BG");
        mvc.perform(post("/api/products/" + id + "/usages").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startedOn\":\"2026-10-10\",\"endedOn\":\"2026-10-01\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void othersCannotSeeOrDeleteMyProducts() throws Exception {
        String mine = register(uniqueEmail());
        String theirs = register(uniqueEmail());
        long id = createProduct(mine, "私の乳液", "水、スクワラン");

        mvc.perform(get("/api/products/" + id).header("Authorization", bearer(theirs)))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/products/" + id).header("Authorization", bearer(theirs)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/products").header("Authorization", bearer(theirs)))
                .andExpect(jsonPath("$.length()").value(0));

        mvc.perform(delete("/api/products/" + id).header("Authorization", bearer(mine)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/products/" + id).header("Authorization", bearer(mine)))
                .andExpect(status().isNotFound());
    }

    @Test
    @SuppressWarnings("unchecked")
    void judgeSendsOnlyMyJudgedRecords() throws Exception {
        String token = register(uniqueEmail());
        long good = createProduct(token, "合った化粧水", "水、セラミドNP");
        long bad = createProduct(token, "合わなかった化粧水", "水、エタノール");
        createProduct(token, "まだ判断していない美容液", "水、ナイアシンアミド");
        addResult(token, good, "good");
        addResult(token, bad, "bad");

        String other = register(uniqueEmail());
        addResult(other, createProduct(other, "他人の化粧水", "水、香料"), "bad");

        mvc.perform(post("/api/judge").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ingredientsText\":\"水、セラミドNP、エタノール\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidate.length()").value(3));

        ArgumentCaptor<List<UsageResult>> records = ArgumentCaptor.forClass(List.class);
        verify(analyzer).judge(any(), records.capture());
        assertThat(records.getValue())
                .containsExactlyInAnyOrder(
                        new UsageResult("good", List.of("水", "セラミドNP")),
                        new UsageResult("bad", List.of("水", "エタノール")));
    }

    // --- 補助 ---

    private String register(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, "password123")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private String login(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(email, "password123")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private long createProduct(String token, String name, String ingredients) throws Exception {
        String body = mvc.perform(post("/api/products").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new java.util.HashMap<>(java.util.Map.of(
                                "name", name, "category", "toner", "ingredientsText", ingredients)))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(body);
        return node.get("id").asLong();
    }

    private void addResult(String token, long productId, String result) throws Exception {
        mvc.perform(post("/api/products/" + productId + "/usages").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"startedOn\":\"2026-10-01\",\"result\":\"" + result + "\"}"))
                .andExpect(status().isCreated());
    }

    private String credentials(String email, String password) throws Exception {
        return json.writeValueAsString(java.util.Map.of("email", email, "password", password));
    }

    private static String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
