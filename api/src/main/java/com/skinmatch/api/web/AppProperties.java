package com.skinmatch.api.web;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** application.yml の skin-match.* の設定。 */
@ConfigurationProperties("skin-match")
public record AppProperties(String analyzerUrl, int sessionDays, List<String> allowedOrigins) {}
