Como Configurar e Rodar o Projeto:
Crie a Estrutura de Pastas: Organize seus arquivos exatamente como mostrado na estrutura acima (seu_projeto/public/, seu_projeto/data/, e os arquivos na raiz).

Instale Node.js: Se você ainda não tem, baixe e instale o Node.js do site oficial (nodejs.org).

Abra o Terminal/Prompt de Comando: Navegue até a pasta seu_projeto/ (a pasta raiz do seu projeto onde está package.json).

Instale as Dependências: Execute o comando:

Bash

npm install
Isso vai instalar o express e o cors.

Crie os Arquivos de Dados Iniciais: Certifique-se de que as pastas data/ existem e que os arquivos establishments.json e quotations.json estão lá, inicialmente vazios como [].

Inicie o Servidor: Execute o comando:

Bash

npm start
Você deverá ver a mensagem: Servidor rodando em http://localhost:3000 e Acesse seu dashboard em http://localhost:3000.

Acesse o Dashboard: Abra seu navegador e vá para http://localhost:3000.

Agora, todos os dados que você adicionar serão salvos nos arquivos .json na pasta data/ do seu projeto. Se você reiniciar o servidor, os dados persistirão.