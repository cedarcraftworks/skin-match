package com.skinmatch.api.product;

import com.skinmatch.api.auth.AuthInterceptor;
import com.skinmatch.api.product.ProductService.Product;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    public record CreateProduct(
            @NotBlank @Size(max = 200) String name,
            @Size(max = 200) String brand,
            @NotBlank @Pattern(regexp = "toner|emulsion|serum|cream|cleanser|sunscreen|base|other") String category,
            @NotBlank @Size(max = 20000) String ingredientsText) {}

    public record CreateUsage(
            @NotNull LocalDate startedOn,
            LocalDate endedOn,
            @Pattern(regexp = "good|bad") String result,
            @Size(max = 1000) String memo) {}

    private final ProductService products;

    public ProductController(ProductService products) {
        this.products = products;
    }

    @GetMapping
    public List<Product> list(@RequestAttribute(AuthInterceptor.USER_ID) long userId) {
        return products.list(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Product create(@RequestAttribute(AuthInterceptor.USER_ID) long userId, @Valid @RequestBody CreateProduct body) {
        return products.create(userId, body.name(), body.brand(), body.category(), body.ingredientsText());
    }

    @GetMapping("/{id}")
    public Product get(@RequestAttribute(AuthInterceptor.USER_ID) long userId, @PathVariable long id) {
        return products.get(userId, id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestAttribute(AuthInterceptor.USER_ID) long userId, @PathVariable long id) {
        products.delete(userId, id);
    }

    @PostMapping("/{id}/usages")
    @ResponseStatus(HttpStatus.CREATED)
    public Product addUsage(
            @RequestAttribute(AuthInterceptor.USER_ID) long userId,
            @PathVariable long id,
            @Valid @RequestBody CreateUsage body) {
        return products.addUsage(userId, id, body.startedOn(), body.endedOn(), body.result(), body.memo());
    }
}
