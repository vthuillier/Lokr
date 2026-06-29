package fr.valentinthuillier.lokr.config;

import fr.valentinthuillier.lokr.filters.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuration de la sécurité de l'application.
 * Configure la gestion de la sécurité HTTP, CORS, CSRF, la politique de session,
 * l'encodage des mots de passe avec Argon2 et le filtrage JWT.
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    /** Filtre d'authentification par jeton JWT. */
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Définit l'encodeur de mot de passe par défaut.
     * Utilise l'algorithme Argon2.
     *
     * @return L'encodeur de mot de passe Argon2
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    /**
     * Configure la chaîne de filtres de sécurité HTTP (SecurityFilterChain).
     *
     * @param http Le builder de configuration de la sécurité HTTP
     * @return La chaîne de filtres de sécurité configurée
     * @throws Exception Si une erreur survient lors de la configuration
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/health",
                                "/actuator/health",
                                "/error"
                        ).permitAll()
                        .requestMatchers("/api/me").authenticated()
                        .requestMatchers("/api/user/**").authenticated()
                        .requestMatchers("/api/users/**").authenticated()
                        .requestMatchers("/api/vault/**").authenticated()
                        .requestMatchers("/api/folders/**").authenticated()
                        .requestMatchers("/api/groups/**").authenticated()
                        .anyRequest().denyAll()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }

    /**
     * Configure les sources de configuration CORS (Cross-Origin Resource Sharing).
     * Autorise les requêtes provenant de n'importe quelle origine en mode développement.
     *
     * @return La source de configuration CORS
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

}
