const express = require('express');
const cors = require('cors'); // Para permitir requisições do frontend
const fs = require('fs'); // Módulo para interagir com o sistema de arquivos
const path = require('path'); // Módulo para lidar com caminhos de arquivo

const app = express();
const PORT = 3000;

// Middleware para permitir requisições de diferentes origens (seu frontend)
app.use(cors());
// Middleware para parsear JSON no corpo das requisições
app.use(express.json());
// Middleware para servir arquivos estáticos (seu frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Caminhos para os arquivos de dados
const establishmentsFilePath = path.join(__dirname, 'data', 'establishments.json');
const quotationsFilePath = path.join(__dirname, 'data', 'quotations.json');

// --- Funções Auxiliares para Leitura/Escrita de Arquivos ---

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8'); // Cria o arquivo se não existir
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
}

function writeJsonFile(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8'); // Formata com 2 espaços
}

// --- Rotas da API para Estabelecimentos ---

// GET /establishments: Retorna todos os estabelecimentos
app.get('/establishments', (req, res) => {
    try {
        const establishments = readJsonFile(establishmentsFilePath);
        // Ordena alfabeticamente por nome antes de enviar
        const sortedEstablishments = establishments.sort((a, b) => a.name.localeCompare(b.name));
        res.json(sortedEstablishments);
    } catch (error) {
        console.error('Erro ao ler estabelecimentos:', error);
        res.status(500).json({ message: 'Erro ao buscar estabelecimentos.' });
    }
});

// POST /establishments: Adiciona um novo estabelecimento
app.post('/establishments', (req, res) => {
    try {
        const { name, contact } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Nome do estabelecimento é obrigatório.' });
        }

        const establishments = readJsonFile(establishmentsFilePath);
        // Verifica se já existe um estabelecimento com o mesmo nome
        const exists = establishments.some(est => est.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            return res.status(409).json({ message: 'Este estabelecimento já foi registrado.' });
        }

        // Gera um ID simples (em um DB real, o DB faria isso)
        const newId = establishments.length > 0 ? Math.max(...establishments.map(e => e.id || 0)) + 1 : 1;
        const newEstablishment = { id: newId, name, contact: contact || '' };
        
        establishments.push(newEstablishment);
        writeJsonFile(establishmentsFilePath, establishments);
        res.status(201).json(newEstablishment);
    } catch (error) {
        console.error('Erro ao adicionar estabelecimento:', error);
        res.status(500).json({ message: 'Erro ao adicionar estabelecimento.' });
    }
});

// DELETE /establishments/:id: Remove um estabelecimento
app.delete('/establishments/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let establishments = readJsonFile(establishmentsFilePath);
        let quotations = readJsonFile(quotationsFilePath);

        const initialLength = establishments.length;
        establishments = establishments.filter(est => est.id !== id);

        if (establishments.length === initialLength) {
            return res.status(404).json({ message: 'Estabelecimento não encontrado.' });
        }

        writeJsonFile(establishmentsFilePath, establishments);
        // Opcional: Para manter a integridade, você pode limpar establishmentName
        // em cotações que se referiam ao estabelecimento deletado, ou simplesmente deixá-las
        // com o nome "órfão", como antes. Deixaremos como está para simplificar.
        // quotations.forEach(q => {
        //     if (q.establishmentId === id) { // Se você usar IDs para vínculo em vez de nome
        //         q.establishmentId = null;
        //         q.establishmentName = 'Estabelecimento Removido';
        //     }
        // });
        // writeJsonFile(quotationsFilePath, quotations);

        res.json({ message: 'Estabelecimento removido com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover estabelecimento:', error);
        res.status(500).json({ message: 'Erro ao remover estabelecimento.' });
    }
});

// --- Rotas da API para Cotações ---

// GET /quotations: Retorna todas as cotações (com filtros e ordenação)
app.get('/quotations', (req, res) => {
    try {
        let quotations = readJsonFile(quotationsFilePath);
        const { feedName, date, sortOrder } = req.query;

        // Filtrar por nome da ração
        if (feedName) {
            quotations = quotations.filter(q => q.feedName.toLowerCase().includes(feedName.toLowerCase()));
        }

        // Filtrar por data
        if (date) {
            quotations = quotations.filter(q => q.date === date);
        }

        // Ordenar por valor
        if (sortOrder === 'asc') {
            quotations.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'desc') {
            quotations.sort((a, b) => b.price - a.price);
        } else {
            // Ordem padrão: por data decrescente, depois por nome da ração ascendente
            quotations.sort((a, b) => {
                if (a.date < b.date) return 1;
                if (a.date > b.date) return -1;
                return a.feedName.localeCompare(b.feedName);
            });
        }
        
        res.json(quotations);
    } catch (error) {
        console.error('Erro ao ler cotações:', error);
        res.status(500).json({ message: 'Erro ao buscar cotações.' });
    }
});

// POST /quotations: Adiciona uma nova cotação
app.post('/quotations', (req, res) => {
    try {
        const { feedName, price, date, establishmentName } = req.body;
        if (!feedName || !price || !date || !establishmentName) {
            return res.status(400).json({ message: 'Todos os campos da cotação são obrigatórios.' });
        }

        const quotations = readJsonFile(quotationsFilePath);
        // Gera um ID simples
        const newId = quotations.length > 0 ? Math.max(...quotations.map(q => q.id || 0)) + 1 : 1;
        const newQuotation = { id: newId, feedName, price, date, establishmentName };
        
        quotations.push(newQuotation);
        writeJsonFile(quotationsFilePath, quotations);
        res.status(201).json(newQuotation);
    } catch (error) {
        console.error('Erro ao adicionar cotação:', error);
        res.status(500).json({ message: 'Erro ao adicionar cotação.' });
    }
});

// DELETE /quotations/:id: Remove uma cotação
app.delete('/quotations/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let quotations = readJsonFile(quotationsFilePath);
        const initialLength = quotations.length;
        quotations = quotations.filter(q => q.id !== id);

        if (quotations.length === initialLength) {
            return res.status(404).json({ message: 'Cotação não encontrada.' });
        }

        writeJsonFile(quotationsFilePath, quotations);
        res.json({ message: 'Cotação removida com sucesso.' });
    } catch (error) {
        console.error('Erro ao remover cotação:', error);
        res.status(500).json({ message: 'Erro ao remover cotação.' });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Acesse seu dashboard em http://localhost:3000');
});