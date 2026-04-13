const loginForm = document.getElementById("loginForm");
const producerForm = document.getElementById("producerForm");
const analysisForm = document.getElementById("analysisForm");

const loginMessage = document.getElementById("loginMessage");
const producerMessage = document.getElementById("producerMessage");
const analysisMessage = document.getElementById("analysisMessage");

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");

const producersTableBody = document.getElementById("producersTableBody");
const analysesTableBody = document.getElementById("analysesTableBody");
const analysisProducerSelect = document.getElementById("analysisProducer");

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
}

function formatDate(dateIso) {
  return new Date(dateIso).toLocaleString("pt-BR");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Erro na operacao.");
  }
  return data;
}

async function loadProducers() {
  const producers = await fetchJson("/api/producers");
  producersTableBody.innerHTML = "";

  analysisProducerSelect.innerHTML = `<option value="">Selecione</option>`;

  producers.forEach((producer) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${producer.name}</td><td>${producer.city}</td><td>${producer.phone}</td>`;
    producersTableBody.appendChild(row);

    const option = document.createElement("option");
    option.value = producer.id;
    option.textContent = producer.name;
    analysisProducerSelect.appendChild(option);
  });
}

async function loadAnalyses() {
  const analyses = await fetchJson("/api/analyses");
  analysesTableBody.innerHTML = "";

  analyses.forEach((analysis) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${formatDate(analysis.createdAt)}</td><td>${analysis.producerName}</td><td>${analysis.stickPercent}%</td>`;
    analysesTableBody.appendChild(row);
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const payload = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const result = await fetchJson("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showMessage(loginMessage, result.message, "success");
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");

    await loadProducers();
    await loadAnalyses();
  } catch (error) {
    showMessage(loginMessage, error.message, "error");
  }
});

producerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(producerForm);
  const payload = {
    name: formData.get("name"),
    city: formData.get("city"),
    phone: formData.get("phone"),
  };

  try {
    const result = await fetchJson("/api/producers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showMessage(producerMessage, result.message, "success");
    producerForm.reset();
    await loadProducers();
  } catch (error) {
    showMessage(producerMessage, error.message, "error");
  }
});

analysisForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(analysisForm);
  const payload = {
    producerId: Number(formData.get("producerId")),
    stickPercent: Number(formData.get("stickPercent")),
  };

  try {
    const result = await fetchJson("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    showMessage(analysisMessage, result.message, "success");
    analysisForm.reset();
    await loadAnalyses();
  } catch (error) {
    showMessage(analysisMessage, error.message, "error");
  }
});
