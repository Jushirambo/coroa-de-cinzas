# Coroa de Cinzas

Jogo de cartas pós-apocalíptico para o navegador. Cada jogador segura **sete cartas** e tenta montar a lenda mais cara — senhores da ferrugem, hordas da estrada, xamãs do reator, marés negras e um trono que já esfriou.

> Trabalho original. A estrutura (mão de sete, compra do baralho ou do descarte, pontuação por combos) é uma mecânica clássica de card games. Nomes, naipes, textos, arte e tema são novos. **Não é Fantasy Realms**, não usa cartas da WizKids e não é um produto afiliado.

## Jogar

```bash
npm install
npm run dev
```

Abra o endereço que o Vite imprimir (por padrão `http://localhost:5173`).

Build estático:

```bash
npm run build
npm run preview
```

Testes do motor de pontuação:

```bash
npm test
```

## Como se joga

1. Cada lado recebe 7 cartas. O resto é o baralho. O descarte começa vazio.
2. No turno: compre **1** carta (topo do baralho **ou** qualquer carta visível do descarte) e descarte **1**.
3. A primeira compra da partida vem obrigatoriamente do baralho.
4. Quando a **10ª** carta entra no descarte, o jogo acaba. Maior força vence.

Cada carta tem força-base e um texto de bônus, penalidade, anulação ou limpeza. Coringas copiam nome e naipe (o Camaleão copia também a força-base). A pontuação é calculada automaticamente.

## Controles

| Ação | |
| --- | --- |
| Clique no baralho / descarte | Comprar |
| Clique numa carta da mão (fase de descarte) | Descartar |
| `H` | Ligar/desligar dica |
| `M` | Mudo |
| `Esc` | Fechar painel |

## Créditos

- Design, regras, textos e implementação: originais deste repositório.
- Tipografia: [Oswald](https://fonts.google.com/specimen/Oswald), [Barlow](https://fonts.google.com/specimen/Barlow), [Cinzel](https://fonts.google.com/specimen/Cinzel), [Special Elite](https://fonts.google.com/specimen/Special+Elite) (SIL OFL / Apache).

## Licença

MIT. Veja `LICENSE`.
