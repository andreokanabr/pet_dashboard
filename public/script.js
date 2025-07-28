document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos HTML
    const establishmentForm = document.getElementById('establishmentForm');
    const establishmentTableBody = document.querySelector('#establishmentTable tbody');
    const quotationForm = document.getElementById('quotationForm');
    const selectedEstablishment = document.getElementById('selectedEstablishment');
    const quotationTableBody = document.querySelector('#quotationTable tbody');

    // Elementos de filtro e ordenação
    const searchFeedInput = document.getElementById('searchFeed');
    const searchDateInput = document.getElementById('searchDate');
    const sortOrderSelect = document.getElementById('sortOrder');
    const applyFiltersButton = document.getElementById('applyFilters');
    const clearFiltersButton = document.getElementById('clearFilters');

    // Variáveis para os gráficos
    let priceByDateChart;
    let priceByFeedChart;

    // URL base do seu backend (onde o server.js estará rodando)
    const API_BASE_URL = 'http://localhost:3000';

    // --- Funções de API (Frontend para Backend) ---

    async function fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            alert('Erro ao carregar dados. Tente novamente.');
            return []; // Retorna um array vazio em caso de erro
        }
    }

    async function postData(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao enviar dados:', error);
            alert(`Erro ao adicionar: ${error.message || 'Verifique o console.'}`);
            throw error; // Propaga o erro para quem chamou
        }
    }

    async function deleteData(url) {
        try {
            const response = await fetch(url, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao deletar dados:', error);
            alert(`Erro ao deletar: ${error.message || 'Verifique o console.'}`);
            throw error; // Propaga o erro
        }
    }

    // --- Gerenciamento de Estabelecimentos ---

    async function getEstablishments() {
        return fetchData(`${API_BASE_URL}/establishments`);
    }

    async function renderEstablishmentsTable() {
        const establishments = await getEstablishments();
        establishmentTableBody.innerHTML = '';

        establishments.forEach(establishment => {
            const row = establishmentTableBody.insertRow();
            row.insertCell(0).textContent = establishment.name;
            row.insertCell(1).textContent = establishment.contact || 'N/A';

            const actionsCell = row.insertCell(2);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Remover';
            deleteButton.classList.add('action-buttons');
            deleteButton.addEventListener('click', async () => {
                if (confirm(`Tem certeza que deseja remover ${establishment.name}?`)) {
                    await deleteEstablishment(establishment.id);
                }
            });
            actionsCell.appendChild(deleteButton);
        });
    }

    async function populateEstablishmentSelect() {
        const establishments = await getEstablishments();
        selectedEstablishment.innerHTML = '<option value="">Selecione um estabelecimento</option>';

        establishments.forEach(establishment => {
            const option = document.createElement('option');
            option.value = establishment.name;
            option.textContent = establishment.name;
            selectedEstablishment.appendChild(option);
        });
    }

    establishmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('establishmentName').value.trim();
        const contact = document.getElementById('establishmentContact').value.trim();

        if (!name) {
            alert('O nome do estabelecimento é obrigatório.');
            return;
        }

        try {
            await postData(`${API_BASE_URL}/establishments`, { name, contact });
            establishmentForm.reset();
            await renderEstablishmentsTable();
            await populateEstablishmentSelect();
        } catch (error) {
            // Erro já tratado em postData
        }
    });

    async function deleteEstablishment(id) {
        try {
            // O backend deve lidar com a lógica de verificar cotações vinculadas
            await deleteData(`${API_BASE_URL}/establishments/${id}`);
            await renderEstablishmentsTable();
            await populateEstablishmentSelect();
            await renderQuotationsTable(); // Atualiza a tabela de cotações caso o estabelecimento excluído afete o display
            await renderCharts();
        } catch (error) {
            // Erro já tratado em deleteData
        }
    }

    // --- Gerenciamento de Cotações ---

    async function getQuotations(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return fetchData(`${API_BASE_URL}/quotations?${queryString}`);
    }

    async function renderQuotationsTable() {
        const filters = {
            feedName: searchFeedInput.value,
            date: searchDateInput.value,
            sortOrder: sortOrderSelect.value
        };
        const quotationsToRender = await getQuotations(filters);
        const establishments = await getEstablishments(); // Para pegar os contatos

        quotationTableBody.innerHTML = '';

        quotationsToRender.forEach(quotation => {
            const row = quotationTableBody.insertRow();
            row.insertCell(0).textContent = quotation.feedName;
            row.insertCell(1).textContent = `R$ ${quotation.price.toFixed(2)}`;
            row.insertCell(2).textContent = quotation.date;
            row.insertCell(3).textContent = quotation.establishmentName;

            // Buscar contato do estabelecimento localmente nos dados já carregados
            const associatedEstablishment = establishments.find(est => est.name === quotation.establishmentName);
            row.insertCell(4).textContent = associatedEstablishment ? associatedEstablishment.contact : 'N/A';

            const actionsCell = row.insertCell(5);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Remover';
            deleteButton.classList.add('action-buttons');
            deleteButton.addEventListener('click', async () => {
                if (confirm(`Tem certeza que deseja remover a cotação da ração ${quotation.feedName} (${quotation.establishmentName})?`)) {
                    await deleteQuotation(quotation.id);
                }
            });
            actionsCell.appendChild(deleteButton);
        });
    }

    quotationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const feedName = document.getElementById('feedName').value.trim();
        const price = parseFloat(document.getElementById('price').value);
        const date = document.getElementById('date').value;
        const establishmentName = selectedEstablishment.value;

        if (!feedName || isNaN(price) || !date || !establishmentName) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const newQuotation = {
            feedName,
            price,
            date,
            establishmentName
        };

        try {
            await postData(`${API_BASE_URL}/quotations`, newQuotation);
            quotationForm.reset();
            selectedEstablishment.value = "";
            await renderQuotationsTable();
            await renderCharts();
        } catch (error) {
            // Erro já tratado em postData
        }
    });

    async function deleteQuotation(id) {
        try {
            await deleteData(`${API_BASE_URL}/quotations/${id}`);
            await renderQuotationsTable();
            await renderCharts();
        } catch (error) {
            // Erro já tratado em deleteData
        }
    }

    // --- Funções de Filtro e Ordenação (agora enviando para o backend) ---

    applyFiltersButton.addEventListener('click', async () => {
        await renderQuotationsTable();
    });

    clearFiltersButton.addEventListener('click', async () => {
        searchFeedInput.value = '';
        searchDateInput.value = '';
        sortOrderSelect.value = 'none';
        await renderQuotationsTable();
    });

    // --- Funções de Gráficos (Chart.js) ---

    async function renderCharts() {
        const quotations = await getQuotations({}); // Pega todas as cotações para o gráfico

        // Dados para o gráfico de Valores por Data
        const dates = [...new Set(quotations.map(q => q.date))].sort();
        const pricesByDate = dates.map(date => {
            const pricesOnDate = quotations.filter(q => q.date === date).map(q => q.price);
            return pricesOnDate.length > 0 ? pricesOnDate.reduce((sum, current) => sum + current, 0) / pricesOnDate.length : 0;
        });

        // Dados para o gráfico de Valores por Ração
        const feedNames = [...new Set(quotations.map(q => q.feedName))];
        const pricesByFeed = feedNames.map(name => {
            const pricesForFeed = quotations.filter(q => q.feedName === name).map(q => q.price);
            return pricesForFeed.length > 0 ? pricesForFeed.reduce((sum, current) => sum + current, 0) / pricesForFeed.length : 0;
        });

        // Gráfico de Valores por Data
        const ctxDate = document.getElementById('priceByDateChart').getContext('2d');
        if (priceByDateChart) {
            priceByDateChart.destroy();
        }
        priceByDateChart = new Chart(ctxDate, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Preço Médio por Data (R$)',
                    data: pricesByDate,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Gráfico de Valores por Ração
        const ctxFeed = document.getElementById('priceByFeedChart').getContext('2d');
        if (priceByFeedChart) {
            priceByFeedChart.destroy();
        }
        priceByFeedChart = new Chart(ctxFeed, {
            type: 'bar',
            data: {
                labels: feedNames,
                datasets: [{
                    label: 'Preço Médio por Ração (R$)',
                    data: pricesByFeed,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // --- Inicialização ---
    async function initializeDashboard() {
        await renderEstablishmentsTable();
        await populateEstablishmentSelect();
        await renderQuotationsTable();
        await renderCharts();
    }

    initializeDashboard();
});