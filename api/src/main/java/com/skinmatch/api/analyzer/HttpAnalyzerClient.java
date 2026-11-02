package com.skinmatch.api.analyzer;

import com.skinmatch.api.web.AppProperties;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Component
public class HttpAnalyzerClient implements AnalyzerClient {

    record NormalizeResponse(List<String> ingredients) {}

    private final RestClient http;

    public HttpAnalyzerClient(RestClient.Builder builder, AppProperties props) {
        this.http = builder.baseUrl(props.analyzerUrl()).build();
    }

    @Override
    public List<String> normalize(String text) {
        return post("/normalize", Map.of("text", text), NormalizeResponse.class).ingredients();
    }

    @Override
    public Judgement judge(List<String> candidate, List<UsageResult> records) {
        return post("/judge", Map.of("candidate", candidate, "records", records), Judgement.class);
    }

    @Override
    public Judgement insights(List<UsageResult> records) {
        return post("/insights", Map.of("records", records), Judgement.class);
    }

    private <T> T post(String path, Object body, Class<T> type) {
        try {
            T result = http.post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(type);
            if (result == null) {
                throw new RestClientException("empty response");
            }
            return result;
        } catch (RestClientException e) {
            // 判定サービスが落ちていても、API 全体は落とさずに分かりやすいエラーを返す
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "成分の判定サービスに接続できませんでした", e);
        }
    }
}
