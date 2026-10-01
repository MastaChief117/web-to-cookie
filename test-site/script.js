let clicks = 0;
document.getElementById('btn').addEventListener('click', () => {
  clicks++;
  document.getElementById('msg').textContent =
    `Button clicked ${clicks} time(s). JS works — served from cookies! 🍪`;
});