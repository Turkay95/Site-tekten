/* =========================================
   ANIMATIONS GSAP (GreenSock)
   ========================================= */

document.addEventListener("DOMContentLoaded", (event) => {
    
    // 1. Enregistrer le plugin ScrollTrigger (permet d'animer quand on scrolle)
    // Note: ScrollTrigger est chargé via CDN dans le HTML
    gsap.registerPlugin(ScrollTrigger);

    // 2. Animation du Hero (Bannière d'accueil)
    // Les éléments apparaissent en cascade (stagger)
    if(document.querySelector('.gsap-hero')) {
        gsap.to(".gsap-hero", {
            y: 0, 
            opacity: 1, 
            duration: 1, 
            stagger: 0.2, // 0.2s de délai entre chaque élément (Titre, puis sous-titre, puis bouton)
            ease: "power3.out" // Effet de ralentissement élégant à la fin
        });
    }

    // 3. Animation des Grilles de Produits / Cartes Services
    // On sélectionne tous les enfants directs des grilles
    const grids = document.querySelectorAll('.grid');
    grids.forEach(grid => {
        // On attend un petit délai pour laisser le temps au JS de générer le HTML des produits
        setTimeout(() => {
            const children = grid.children;
            if(children.length > 0) {
                gsap.fromTo(children, 
                    { y: 50, opacity: 0 }, // État de départ
                    { 
                        y: 0, 
                        opacity: 1, 
                        duration: 0.8, 
                        stagger: 0.1, // Effet domino
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: grid,
                            start: "top 85%", // L'anim commence quand le haut de la grille est à 85% de l'écran
                        }
                    }
                );
            }
        }, 100); // Délai technique
    });

    // 4. Animation générique "Fade Up" (Pour les titres de section)
    gsap.utils.toArray('.gsap-fade-up').forEach(element => {
        gsap.fromTo(element,
            { y: 30, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: element,
                    start: "top 90%"
                }
            }
        );
    });
});