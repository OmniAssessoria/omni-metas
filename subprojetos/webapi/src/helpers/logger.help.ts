import fs from "fs";
import path from "path";

export default class LoggerHelper {
  private filePath: string;

  constructor(fileName: string) {
    const logsDir = path.resolve(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const dataAtual = new Date();
    const dataFormatada = new Intl.DateTimeFormat("fr-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dataAtual);

    this.filePath = path.join(logsDir, `${fileName}_${dataFormatada}.txt`);
  }

  private formatMessage(level: "INFO" | "WARN" | "ERROR", message: string): string {
    const now = new Date();
    const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    }).format(now);

    return `[${dateTimeFormat}] [${level}] ${message}\n`;
  }

  public info(message: string) {
    fs.appendFileSync(this.filePath, this.formatMessage("INFO", message));
  }

  public warn(message: string) {
    fs.appendFileSync(this.filePath, this.formatMessage("WARN", message));
  }

  public error(message: string, error?: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const trace = error?.stack ? `\nStack: ${error.stack}` : "";
    fs.appendFileSync(this.filePath, this.formatMessage("ERROR", `${message} - ${errorMessage}${trace}`));
  }
}
