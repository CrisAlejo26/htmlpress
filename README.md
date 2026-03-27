# htmlpress

Convierte archivos HTML a PDF usando Puppeteer. Incluye una interfaz web para previsualizar y ajustar la configuracion antes de exportar.

## Setup

```bash
npm install
```

## Uso

### Interfaz web (recomendado)

Lanza la interfaz grafica en el navegador:

```bash
npm run ui
```

Abre `http://localhost:3000` y podras:

- **Subir archivos HTML** arrastrando al area de drop o seleccionando desde el explorador
- **Seleccionar archivos existentes** del directorio `input/`
- **Previsualizar** el HTML y el PDF resultante en tiempo real
- **Ajustar configuracion:**
  - Tamano de pagina (A4, A3, Letter, Legal, Tabloid o personalizado)
  - Margenes individuales o vinculados (en mm)
  - Modo pagina unica (todo el contenido en una sola hoja)
- **Descargar el PDF** generado (se guarda tambien en `output/`)

La vista previa se regenera automaticamente al cambiar cualquier ajuste.

### Linea de comandos (CLI)

Para conversion rapida sin interfaz:

```bash
# Convertir todos los HTML en input/ a PDF (A4, multiples paginas)
npm run dev

# Convertir en modo pagina unica
npm run dev:single
```

Los PDFs se guardan en el directorio `output/`.

## Estructura del proyecto

```
htmlpress/
├── input/              # Archivos HTML a convertir
├── output/             # PDFs generados
├── assets/             # Recursos (imagenes, fuentes, etc.)
├── src/
│   ├── index.ts        # CLI - conversion por lotes
│   ├── server.ts       # Servidor web con API para la interfaz
│   └── ui/
│       └── index.html  # Interfaz web
├── package.json
└── tsconfig.json
```

## Scripts

| Comando              | Descripcion                                       |
| -------------------- | ------------------------------------------------- |
| `npm run ui`         | Lanza la interfaz web en http://localhost:3000     |
| `npm run dev`        | Convierte todos los HTML a PDF (CLI)               |
| `npm run dev:single` | Convierte a PDF en modo pagina unica (CLI)         |
| `npm run build`      | Compila TypeScript                                 |
| `npm start`          | Ejecuta la version compilada                       |
| `npm run lint`       | Revisa errores de lint                             |
| `npm run lint:fix`   | Corrige errores de lint automaticamente            |
| `npm run format`     | Formatea el codigo con Prettier                    |

## API del servidor

El servidor expone los siguientes endpoints:

| Metodo | Ruta            | Descripcion                                  |
| ------ | --------------- | -------------------------------------------- |
| GET    | `/api/files`    | Lista los archivos HTML en `input/`          |
| POST   | `/api/upload`   | Sube un archivo HTML a `input/`              |
| POST   | `/api/pdf`      | Genera un PDF y lo devuelve como blob        |
| POST   | `/api/save`     | Genera un PDF, lo guarda en `output/` y descarga |

### Ejemplo: generar PDF via API

```bash
curl -X POST http://localhost:3000/api/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "file": "mi_archivo.html",
    "format": "A4",
    "singlePage": false,
    "margins": { "top": 0, "right": 0, "bottom": 0, "left": 0 }
  }' \
  --output resultado.pdf
```

## Configuracion del PDF

| Opcion         | Valores                                          | Default |
| -------------- | ------------------------------------------------ | ------- |
| `format`       | `A4`, `A3`, `Letter`, `Legal`, `Tabloid`, `custom` | `A4`  |
| `customWidth`  | Cualquier medida (ej: `210mm`)                   | —       |
| `customHeight` | Cualquier medida (ej: `297mm`)                   | —       |
| `singlePage`   | `true` / `false`                                 | `false` |
| `margins`      | Objeto con `top`, `right`, `bottom`, `left` (mm) | `0`     |

## Creditos

Desarrollado por **Cristian Alejandro Arroyave**.

Construido con:
- [Puppeteer](https://pptr.dev/) — renderizado y generacion de PDF
- [Express](https://expressjs.com/) — servidor web para la interfaz
- [TypeScript](https://www.typescriptlang.org/) — tipado estatico

## License

MIT
