package com.skinmatch.api.product;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** 化粧品・成分・使用記録の読み書き。どの操作も user_id で絞り込み、本人のデータだけを扱う。 */
@Repository
public class ProductRepository {

    record ProductRow(long id, String name, String brand, String category, OffsetDateTime createdAt) {}

    record UsageRow(
            long id, long productId, LocalDate startedOn, LocalDate endedOn, String result, String memo) {}

    record IngredientRow(long productId, String name) {}

    private final JdbcClient db;

    public ProductRepository(JdbcClient db) {
        this.db = db;
    }

    public long insertProduct(long userId, String name, String brand, String category, String raw) {
        return db.sql("""
                        INSERT INTO products (user_id, name, brand, category, raw_ingredients)
                        VALUES (:user, :name, :brand, :category, :raw) RETURNING id""")
                .param("user", userId)
                .param("name", name)
                .param("brand", brand)
                .param("category", category)
                .param("raw", raw)
                .query(Long.class)
                .single();
    }

    public void insertIngredients(long productId, List<String> names) {
        for (int i = 0; i < names.size(); i++) {
            // 同じ成分名は 1 行にまとめる。すでにあれば、その id を返す。
            long ingredientId = db.sql("""
                            INSERT INTO ingredients (name) VALUES (:name)
                            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id""")
                    .param("name", names.get(i))
                    .query(Long.class)
                    .single();
            db.sql("""
                            INSERT INTO product_ingredients (product_id, ingredient_id, position)
                            VALUES (:product, :ingredient, :position)""")
                    .param("product", productId)
                    .param("ingredient", ingredientId)
                    .param("position", i + 1)
                    .update();
        }
    }

    public List<ProductRow> findProducts(long userId) {
        return db.sql("""
                        SELECT id, name, brand, category, created_at FROM products
                        WHERE user_id = :user ORDER BY created_at DESC, id DESC""")
                .param("user", userId)
                .query(ProductRow.class)
                .list();
    }

    public Optional<ProductRow> findProduct(long userId, long productId) {
        return db.sql("""
                        SELECT id, name, brand, category, created_at FROM products
                        WHERE user_id = :user AND id = :id""")
                .param("user", userId)
                .param("id", productId)
                .query(ProductRow.class)
                .optional();
    }

    public Map<Long, List<String>> ingredientsOf(Collection<Long> productIds) {
        Map<Long, List<String>> result = new LinkedHashMap<>();
        if (productIds.isEmpty()) {
            return result;
        }
        db.sql("""
                        SELECT pi.product_id, i.name FROM product_ingredients pi
                        JOIN ingredients i ON i.id = pi.ingredient_id
                        WHERE pi.product_id IN (:ids) ORDER BY pi.product_id, pi.position""")
                .param("ids", productIds)
                .query(IngredientRow.class)
                .list()
                .forEach(r -> result.computeIfAbsent(r.productId(), k -> new ArrayList<>()).add(r.name()));
        return result;
    }

    public Map<Long, List<UsageRow>> usagesOf(Collection<Long> productIds) {
        Map<Long, List<UsageRow>> result = new LinkedHashMap<>();
        if (productIds.isEmpty()) {
            return result;
        }
        db.sql("""
                        SELECT id, product_id, started_on, ended_on, result, memo FROM usage_records
                        WHERE product_id IN (:ids) ORDER BY started_on DESC, id DESC""")
                .param("ids", productIds)
                .query(UsageRow.class)
                .list()
                .forEach(r -> result.computeIfAbsent(r.productId(), k -> new ArrayList<>()).add(r));
        return result;
    }

    public long insertUsage(long productId, LocalDate startedOn, LocalDate endedOn, String result, String memo) {
        return db.sql("""
                        INSERT INTO usage_records (product_id, started_on, ended_on, result, memo)
                        VALUES (:product, :started, :ended, :result, :memo) RETURNING id""")
                .param("product", productId)
                .param("started", startedOn)
                .param("ended", endedOn)
                .param("result", result)
                .param("memo", memo)
                .query(Long.class)
                .single();
    }

    public boolean deleteProduct(long userId, long productId) {
        return db.sql("DELETE FROM products WHERE user_id = :user AND id = :id")
                        .param("user", userId)
                        .param("id", productId)
                        .update()
                > 0;
    }
}
