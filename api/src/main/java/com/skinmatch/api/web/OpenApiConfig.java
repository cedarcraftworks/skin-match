package com.skinmatch.api.web;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/** /swagger-ui.html に API 仕様書を自動で表示する。右上の Authorize にトークンを入れると試せる。 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "肌に合う次の一本 API",
                version = "1.0.0",
                description = "化粧品と使用記録の保存、自分の記録にもとづく候補の判定"),
        security = @SecurityRequirement(name = "bearer"))
@SecurityScheme(name = "bearer", type = SecuritySchemeType.HTTP, scheme = "bearer")
public class OpenApiConfig {}
