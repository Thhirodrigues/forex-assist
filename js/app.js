const app = {
  currentTab: "dashboard",

  init() {
    this.render();
    this.bindEvents();
  },

  bindEvents() {
    document.addEventListener("click", (e) => {

      const tab = e.target.dataset.tab;

      if (tab) {
        this.currentTab = tab;
        this.render();
      }

    });
  },

  render() {

    const content = document.getElementById("content");

    switch (this.currentTab) {

      case "dashboard":
        content.innerHTML = dashboardView();
        break;

      case "scanner":
        content.innerHTML = scannerView();
        break;

      case "historico":
        content.innerHTML = historicoView();
        break;

      case "manual":
        content.innerHTML = manualView();
        break;

      case "config":
        content.innerHTML = configView();
        break;

    }

  }
};

window.addEventListener("load", () => {
  app.init();
});
