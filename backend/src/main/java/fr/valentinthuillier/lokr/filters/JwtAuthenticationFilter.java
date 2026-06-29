package fr.valentinthuillier.lokr.filters;

import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.repositories.UserRepository;
import fr.valentinthuillier.lokr.services.JwtService;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Filtre de sécurité interceptant chaque requête HTTP pour valider le jeton JWT.
 * S'il est valide, il authentifie l'utilisateur dans le contexte de sécurité Spring.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

        /** Service de gestion des jetons JWT. */
        private final JwtService jwtService;

        /** Référentiel de gestion des utilisateurs. */
        private final UserRepository userRepository;

        /**
         * Intercepte la requête HTTP pour extraire et valider le jeton JWT de l'en-tête "Authorization".
         * Authentifie ensuite l'utilisateur s'il est valide.
         *
         * @param request La requête HTTP reçue
         * @param response La réponse HTTP à renvoyer
         * @param filterChain La chaîne de filtres Spring Security
         * @throws ServletException Si une erreur liée aux servlets survient
         * @throws IOException Si une erreur d'entrée/sortie survient
         */
        @Override
        protected void doFilterInternal(
                        HttpServletRequest request,
                        HttpServletResponse response,
                        FilterChain filterChain) throws ServletException, IOException {

                String authHeader = request.getHeader("Authorization");

                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                        filterChain.doFilter(request, response);
                        return;
                }

                User user = null;

                String token = authHeader.replace("Bearer ", "");
                try {
                        UUID userId = jwtService.extractUserId(token);
                        user = userRepository.findById(userId)
                                        .orElse(null);
                } catch (ExpiredJwtException e) {
                        System.out.println("Token expired!");
                }

                if (user != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                        user,
                                        null,
                                        List.of(new SimpleGrantedAuthority("ROLE_USER")));

                        authentication.setDetails(
                                        new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                }

                filterChain.doFilter(request, response);

        }
}
