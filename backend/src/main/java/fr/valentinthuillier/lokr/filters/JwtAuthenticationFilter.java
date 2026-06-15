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

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

        private final JwtService jwtService;
        private final UserRepository userRepository;

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
