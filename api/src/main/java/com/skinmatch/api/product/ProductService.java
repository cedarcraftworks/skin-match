package com.skinmatch.api.product;

import com.skinmatch.api.analyzer.AnalyzerClient;
import com.skinmatch.api.analyzer.AnalyzerClient.UsageResult;
import com.skinmatch.api.product.ProductRepository.ProductRow;
import com.skinmatch.api.product.ProductRepository.UsageRow;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductService {

    public record Usage(long id, LocalDate startedOn, LocalDate endedOn, String result, String memo) {}

    public record Product(
            long id,
            String name,
            String brand,
            String category,
            List<String> ingredients,
            String latestResult,
            List<Usage> usages,
            OffsetDateTime createdAt) {}

    private final ProductRepository repo;
    private final AnalyzerClient analyzer;

    public ProductService(ProductRepository repo, AnalyzerClient analyzer) {
        this.repo = repo;
        this.analyzer = analyzer;
    }

    @Transactional
    public Product create(long userId, String name, String brand, String category, String rawIngredients) {
        List<String> ingredients = analyzer.normalize(rawIngredients);
        if (ingredients.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "成分を読み取れませんでした");
        }
        long id = repo.insertProduct(userId, name, blankToNull(brand), category, rawIngredients);
        repo.insertIngredients(id, ingredients);
        return get(userId, id);
    }

    public List<Product> list(long userId) {
        List<ProductRow> rows = repo.findProducts(userId);
        List<Long> ids = rows.stream().map(ProductRow::id).toList();
        Map<Long, List<String>> ingredients = repo.ingredientsOf(ids);
        Map<Long, List<UsageRow>> usages = repo.usagesOf(ids);
        return rows.stream()
                .map(r -> toProduct(r, ingredients.getOrDefault(r.id(), List.of()), usages.getOrDefault(r.id(), List.of())))
                .toList();
    }

    public Product get(long userId, long productId) {
        ProductRow row = repo.findProduct(userId, productId).orElseThrow(ProductService::notFound);
        List<Long> ids = List.of(row.id());
        return toProduct(
                row,
                repo.ingredientsOf(ids).getOrDefault(row.id(), List.of()),
                repo.usagesOf(ids).getOrDefault(row.id(), List.of()));
    }

    @Transactional
    public Product addUsage(long userId, long productId, LocalDate startedOn, LocalDate endedOn, String result, String memo) {
        repo.findProduct(userId, productId).orElseThrow(ProductService::notFound);
        if (endedOn != null && endedOn.isBefore(startedOn)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "やめた日は使い始めた日より後にしてください");
        }
        repo.insertUsage(productId, startedOn, endedOn, result, blankToNull(memo));
        return get(userId, productId);
    }

    public void delete(long userId, long productId) {
        if (!repo.deleteProduct(userId, productId)) {
            throw notFound();
        }
    }

    /** 判定に使う記録：「合った／合わなかった」を記録した化粧品だけ（最新の結果を使う）。 */
    public List<UsageResult> judgedRecords(long userId) {
        return list(userId).stream()
                .filter(p -> p.latestResult() != null)
                .map(p -> new UsageResult(p.latestResult(), p.ingredients()))
                .toList();
    }

    private static Product toProduct(ProductRow r, List<String> ingredients, List<UsageRow> usages) {
        // usages は使い始めた日の新しい順。結果を記録した一番新しいものを、その化粧品の結果とする。
        String latest = usages.stream().map(UsageRow::result).filter(x -> x != null).findFirst().orElse(null);
        List<Usage> views = usages.stream()
                .map(u -> new Usage(u.id(), u.startedOn(), u.endedOn(), u.result(), u.memo()))
                .toList();
        return new Product(r.id(), r.name(), r.brand(), r.category(), ingredients, latest, views, r.createdAt());
    }

    private static String blankToNull(String s) {
        return Optional.ofNullable(s).map(String::trim).filter(x -> !x.isEmpty()).orElse(null);
    }

    private static ResponseStatusException notFound() {
        // 他人の化粧品も「見つからない」と返し、存在するかどうかを漏らさない
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "化粧品が見つかりません");
    }
}
