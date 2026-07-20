import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Rota de IA para Relatório de UX/Testes
  app.post("/api/generate-ux-report", async (req, res) => {
    try {
      const { testName, steps, status, error } = req.body;
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Atue como um Engenheiro de Qualidade Sênior e Especialista em UX (User Experience).
        Analise o seguinte log de execução de teste automatizado em um sistema ERP Financeiro:
        
        NOME DO TESTE: ${testName}
        STATUS FINAL: ${status}
        ERRO (se houver): ${error || 'Nenhum'}
        PASSOS EXECUTADOS:
        ${JSON.stringify(steps, null, 2)}

        Gere um laudo profissional formatado em Markdown com as seguintes seções:
        1. 💎 RESUMO DA EXPERIÊNCIA: Avalie se o fluxo é intuitivo para o usuário final.
        2. 🛠 INTEGRIDADE TÉCNICA: Analise se os estados da UI responderam corretamente.
        3. 🚩 PONTOS DE ATENÇÃO: Identifique possíveis melhorias ou riscos de negócio.
        4. ✅ VEREDITO: Informe se a funcionalidade está pronta para produção (Go/No-Go).

        Mantenha um tom executivo, direto e altamente técnico.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ report: response.text() });
    } catch (err: any) {
      console.error("[IA-REPORT-ERROR]", err);
      res.status(500).json({ error: "Falha ao gerar relatório de IA" });
    }
  });

  // OAuth e Vite (Mantenha o código original aqui)
  // ... (restante do arquivo server.ts sem alterações)
  
  const getPort = () => {
    if (process.env.PORT) return parseInt(process.env.PORT, 10);
    return 3000;
  };
  const PORT = getPort();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) { next(e); }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();