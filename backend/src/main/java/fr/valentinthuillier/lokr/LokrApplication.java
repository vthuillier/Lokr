package fr.valentinthuillier.lokr;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Classe principale de démarrage de l'application Lokr.
 * Initialise le contexte Spring Boot.
 */
@SpringBootApplication
public class LokrApplication {

	/**
	 * Point d'entrée de l'application Java.
	 *
	 * @param args Arguments de la ligne de commande
	 */
	public static void main(String[] args) {
		SpringApplication.run(LokrApplication.class, args);
	}

}
