# Câmbio

Conversor de moedas com foco inicial em dólar americano (USD) e real brasileiro (BRL). Interface responsiva, sem cadastro e com cotação de referência consultada diretamente no navegador.

## Recursos

- Conversão de USD para BRL e de BRL para USD.
- Atualização manual da cotação.
- Valores rápidos para simulação.
- Exibição da taxa e da data de referência.
- Formatação monetária brasileira.
- Layout responsivo e animações sutis.
- Respeita a preferência do sistema por movimento reduzido.

## Cotação

As taxas são consultadas na API pública [Frankfurter](https://frankfurter.dev/), sem chave de API.

Endpoint utilizado:

```
https://api.frankfurter.dev/v2/rate/usd/brl
```

As taxas são referências publicadas pelas fontes de dados e não cotações de negociação em tempo real. Bancos, cartões e casas de câmbio podem aplicar spreads, tarifas e valores diferentes.

## Publicação

O projeto é estático e pode ser publicado pelo GitHub Pages. Não requer servidor próprio.

## Estrutura

```
3dViewer/
├── index.html
├── style.css
├── app.js
└── README.md
```

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Frankfurter Exchange Rates API
