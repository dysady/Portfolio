// Effet d'opacité sur le header lors du défilement
document.addEventListener('scroll', () => {
    scrolling();
});

function scrolling() {
    const header = document.getElementById('intro');
    const scrollY = window.scrollY;

    // Réduire l'opacité du header en fonction du défilement
    const opacity = Math.max(1 - scrollY / window.innerHeight * 0.5, 0);
    header.style.opacity = opacity;

    const portfolio = document.getElementById('portfolio');
    const scrollYPortfolio = window.scrollY;

    // Réduire l'opacité du portfolio en fonction du défilement
    const opacityP = Math.max(scrollYPortfolio / (2*window.innerHeight), 0);
    portfolio.style.opacity = opacityP;
    
    const barre = document.getElementById("barre");
    if (scrollY > window.innerHeight*0.8 &&  scrollY < 1.2*window.innerHeight) {
        
        barre.style.display = "block";
    }else{
        barre.style.display="none";
    }
};

scrolling();