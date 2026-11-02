package com.skinmatch.api.judge;

import com.skinmatch.api.analyzer.AnalyzerClient;
import com.skinmatch.api.analyzer.AnalyzerClient.Judgement;
import com.skinmatch.api.analyzer.AnalyzerClient.UsageResult;
import com.skinmatch.api.auth.AuthInterceptor;
import com.skinmatch.api.product.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 候補の判定と、記録全体の傾向。判定そのものは Python のサービスに任せ、ここでは本人の記録を集めて渡す。 */
@RestController
public class JudgeController {

    public record JudgeRequest(@NotBlank @Size(max = 20000) String ingredientsText) {}

    public record JudgeResponse(List<String> candidate, Judgement judgement) {}

    private final ProductService products;
    private final AnalyzerClient analyzer;

    public JudgeController(ProductService products, AnalyzerClient analyzer) {
        this.products = products;
        this.analyzer = analyzer;
    }

    @PostMapping("/api/judge")
    public JudgeResponse judge(
            @RequestAttribute(AuthInterceptor.USER_ID) long userId, @Valid @RequestBody JudgeRequest body) {
        List<String> candidate = analyzer.normalize(body.ingredientsText());
        if (candidate.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "成分を読み取れませんでした");
        }
        List<UsageResult> records = products.judgedRecords(userId);
        return new JudgeResponse(candidate, analyzer.judge(candidate, records));
    }

    @GetMapping("/api/insights")
    public Judgement insights(@RequestAttribute(AuthInterceptor.USER_ID) long userId) {
        return analyzer.insights(products.judgedRecords(userId));
    }
}
