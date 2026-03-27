# htmlpress

Bulk convert HTML files to PDF using Puppeteer.

## Setup

```bash
npm install
```

## Usage

1. Place your `.html` files in the `input/` directory
2. Run the converter:

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

3. Find your PDFs in the `output/` directory

## Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `npm run dev`      | Run with tsx (no build needed) |
| `npm run build`    | Compile TypeScript             |
| `npm start`        | Run compiled version           |
| `npm run lint`     | Check for lint errors          |
| `npm run lint:fix` | Auto-fix lint errors           |
| `npm run format`   | Format code with Prettier      |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
