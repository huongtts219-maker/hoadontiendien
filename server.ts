import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const SAMPLE_BILL_PATH = path.resolve(__dirname, 'public/assets/aistudio/image_20a4dd18.png');

const billResponseSchema = {
  type: Type.OBJECT,
  properties: {
    utilityCompany: {
      type: Type.OBJECT,
      properties: {
        corporationName: { type: Type.STRING, description: 'Tên tổng công ty điện lực, ví dụ EVNHCMC - TỔNG CÔNG TY ĐIỆN LỰC THÀNH PHỐ HỒ CHÍ MINH' },
        unitName: { type: Type.STRING, description: 'Tên công ty điện lực cấp quận/huyện/tỉnh, ví dụ CÔNG TY ĐIỆN LỰC BÌNH PHÚ' },
        address: { type: Type.STRING, description: 'Địa chỉ công ty điện lực' },
        phone: { type: Type.STRING, description: 'Số điện thoại chăm sóc khách hàng' },
        repairPhone: { type: Type.STRING, description: 'Số điện thoại sửa chữa (ĐT SC)' },
        taxCode: { type: Type.STRING, description: 'Mã số thuế của đơn vị điện lực' },
      },
      required: ['corporationName', 'unitName', 'address', 'phone', 'repairPhone', 'taxCode'],
    },
    invoiceMeta: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Tiêu đề hóa đơn, ví dụ HÓA ĐƠN GTGT (TIỀN ĐIỆN)' },
        subtitle: { type: Type.STRING, description: 'Phụ đề nếu có, ví dụ Bản thể hiện của hóa đơn điện tử' },
        formCode: { type: Type.STRING, description: 'Mẫu số hóa đơn, ví dụ 01GTKT0/001' },
        serialCode: { type: Type.STRING, description: 'Ký hiệu hóa đơn, ví dụ AB/17E' },
        invoiceNumber: { type: Type.STRING, description: 'Số hóa đơn, ví dụ 4649163' },
        invoiceId: { type: Type.STRING, description: 'ID hóa đơn (ID HĐ), ví dụ 371346658' },
        batch: { type: Type.STRING, description: 'Đợt' },
        month: { type: Type.STRING, description: 'Tháng, ví dụ 11/2017' },
        period: { type: Type.STRING, description: 'Kỳ hóa đơn, ví dụ 12/2017' },
        fromDate: { type: Type.STRING, description: 'Từ ngày (DD/MM/YYYY)' },
        toDate: { type: Type.STRING, description: 'Đến ngày (DD/MM/YYYY)' },
        issueDate: { type: Type.STRING, description: 'Ngày ký / ngày lập hóa đơn' },
        signer: { type: Type.STRING, description: 'Người ký hóa đơn' },
      },
      required: [
        'title',
        'subtitle',
        'formCode',
        'serialCode',
        'invoiceNumber',
        'invoiceId',
        'batch',
        'month',
        'period',
        'fromDate',
        'toDate',
        'issueDate',
        'signer',
      ],
    },
    customerInfo: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Tên khách hàng (để trống "" nếu trên ảnh bị xóa hoặc trống)' },
        address: { type: Type.STRING, description: 'Địa chỉ khách hàng' },
        usageAddress: { type: Type.STRING, description: 'Địa chỉ dùng điện' },
        phone: { type: Type.STRING, description: 'Điện thoại khách hàng' },
        taxCode: { type: Type.STRING, description: 'MST khách hàng' },
        customerCode: { type: Type.STRING, description: 'Mã khách hàng (Mã KH)' },
        paymentCode: { type: Type.STRING, description: 'Mã thanh toán (Mã T.Toán), ví dụ PE06000144725' },
        stationCode: { type: Type.STRING, description: 'Mã trạm' },
        gcsBookCode: { type: Type.STRING, description: 'Số GCS (Sổ ghi chỉ số)' },
        gcsSession: { type: Type.STRING, description: 'Phiên GCS (P GCS)' },
        meterNumber: { type: Type.STRING, description: 'Số công tơ' },
        meteringPointCode: { type: Type.STRING, description: 'Mã điểm đo' },
        sectorCode: { type: Type.STRING, description: 'Mã ngành nghề (Mã NN)' },
        tariffCode: { type: Type.STRING, description: 'Mã giá, ví dụ KT: 100%*SHBT-A' },
        householdsCount: { type: Type.NUMBER, description: 'Số hộ sử dụng chung (nếu có, không có thì 1 hoặc 0)' },
        teamCode: { type: Type.STRING, description: 'Mã tổ' },
        voltageLevel: { type: Type.STRING, description: 'Cấp điện áp (Cấp ĐA)' },
        slvcSlhc: { type: Type.STRING, description: 'SLVC/SLHC' },
        cosPhi: { type: Type.STRING, description: 'Hệ số Cosfi' },
        kFactorPercent: { type: Type.STRING, description: 'Hệ số K %' },
      },
      required: [
        'name',
        'address',
        'usageAddress',
        'phone',
        'taxCode',
        'customerCode',
        'paymentCode',
        'stationCode',
        'gcsBookCode',
        'gcsSession',
        'meterNumber',
        'meteringPointCode',
        'sectorCode',
        'tariffCode',
        'householdsCount',
        'teamCode',
        'voltageLevel',
        'slvcSlhc',
        'cosPhi',
        'kFactorPercent',
      ],
    },
    meterReadings: {
      type: Type.ARRAY,
      description: 'Danh sách các dòng chỉ số công tơ trên hóa đơn',
      items: {
        type: Type.OBJECT,
        properties: {
          registerType: { type: Type.STRING, description: 'Bộ chỉ số (KT, BT, CD, TD...)' },
          newReading: { type: Type.NUMBER, description: 'Chỉ số mới (dạng số nguyên/thập phân chuẩn, bỏ dấu chấm ngăn cách hàng nghìn)' },
          oldReading: { type: Type.NUMBER, description: 'Chỉ số cũ (dạng số chuẩn)' },
          multiplier: { type: Type.NUMBER, description: 'Hệ số nhân' },
          consumedKwh: { type: Type.NUMBER, description: 'Điện năng tiêu thụ' },
          directKwh: { type: Type.NUMBER, description: 'Điện năng trực tiếp' },
          deductedKwh: { type: Type.NUMBER, description: 'Điện năng trừ phụ' },
          billedKwh: { type: Type.NUMBER, description: 'Điện năng tính giá' },
        },
        required: [
          'registerType',
          'newReading',
          'oldReading',
          'multiplier',
          'consumedKwh',
          'directKwh',
          'deductedKwh',
          'billedKwh',
        ],
      },
    },
    tariffBreakdown: {
      type: Type.ARRAY,
      description: 'Chi tiết từng bậc thang giá điện hoặc biểu giá theo giờ',
      items: {
        type: Type.OBJECT,
        properties: {
          tierLabel: { type: Type.STRING, description: 'Tên bậc hoặc mô tả khung giờ (ví dụ Bậc 1 (0–50 kWh), Bậc 2, Giờ bình thường...)' },
          kwh: { type: Type.NUMBER, description: 'Sản lượng kWh của bậc/mức giá này' },
          unitPrice: { type: Type.NUMBER, description: 'Đơn giá VNĐ/kWh (ví dụ 1.484 trên hóa đơn Việt Nam nghĩa là 1484 đồng)' },
          amount: { type: Type.NUMBER, description: 'Thành tiền VNĐ (ví dụ 74.200 trên hóa đơn nghĩa là 74200 đồng)' },
        },
        required: ['tierLabel', 'kwh', 'unitPrice', 'amount'],
      },
    },
    summary: {
      type: Type.OBJECT,
      properties: {
        totalBilledKwh: { type: Type.NUMBER, description: 'Tổng điện năng tính giá (kWh)' },
        subtotalAmount: { type: Type.NUMBER, description: 'Cộng tiền điện chưa bao gồm thuế GTGT (VNĐ)' },
        vatRatePercent: { type: Type.NUMBER, description: 'Thuế suất GTGT (ví dụ 10 hoặc 8)' },
        vatAmount: { type: Type.NUMBER, description: 'Tiền thuế GTGT (VNĐ)' },
        totalPayable: { type: Type.NUMBER, description: 'Tổng tiền thanh toán (VNĐ)' },
        amountInWords: { type: Type.STRING, description: 'Số tiền bằng chữ nguyên văn trên hóa đơn' },
      },
      required: [
        'totalBilledKwh',
        'subtotalAmount',
        'vatRatePercent',
        'vatAmount',
        'totalPayable',
        'amountInWords',
      ],
    },
    notes: {
      type: Type.STRING,
      description: 'Ghi chú bổ sung nếu phát hiện vùng ảnh mờ, che khuất hoặc thông tin khác trên hóa đơn',
    },
  },
  required: [
    'utilityCompany',
    'invoiceMeta',
    'customerInfo',
    'meterReadings',
    'tariffBreakdown',
    'summary',
  ],
};

const SYSTEM_INSTRUCTION = `Bạn là hệ thống OCR và trích xuất dữ liệu tài chính chuyên sâu cho hóa đơn tiền điện tại Việt Nam (EVNHCMC, EVNHANOI, EVNNPC, EVNCPC, EVNSPC, và hóa đơn điện tử/giấy các đơn vị điện lực).

QUY TẮC QUAN TRỌNG KHI ĐỌC SỐ LIỆU TIỀN ĐIỆN VIỆT NAM:
1. Dấu chấm "." trong số nguyên trên hóa đơn Việt Nam (ví dụ: 13.895, 13.530, 1.484, 74.200, 716.345, 787.980) là dấu ngăn cách hàng nghìn, KHÔNG PHẢI dấu thập phân! Phải chuyển thành số nguyên chuẩn: 13895, 13530, 1484, 74200, 716345, 787980.
2. Nếu có dấu phẩy "," ngăn cách phần thập phân (ví dụ 12,5 kWh), chuyển thành 12.5.
3. Đối với bảng bậc thang tính tiền điện (cột ĐN tính giá, Đơn giá, Thành tiền): nếu trên hóa đơn chỉ liệt kê các dòng số (ví dụ dòng 1: 50 | 1.484 | 74.200; dòng 2: 50 | 1.533 | 76.650...), hãy gán nhãn rõ ràng là "Bậc 1", "Bậc 2", "Bậc 3"... theo đúng thứ tự từ trên xuống dưới (hoặc giữ nguyên tên biểu giá nếu hóa đơn ghi "Giờ bình thường", "Giờ cao điểm", "Giờ thấp điểm").
4. Tuyệt đối KHÔNG tự bịa thông tin cho các ô trống hoặc bị che/xóa trên hóa đơn (ví dụ Tên khách hàng, Địa chỉ khách hàng, MST nếu trống thì trả về chuỗi rỗng "").
5. Kiểm tra chéo toán học: đảm bảo các số đọc được nhất quán giữa (Chỉ số mới - Chỉ số cũ) * Hệ số nhân, tổng các bậc thang = Cộng tiền điện trước thuế, và Cộng + Thuế GTGT = Tổng tiền thanh toán.
6. Nếu hình ảnh KHÔNG phải là hóa đơn tiền điện hoặc hoàn toàn không đọc được, vẫn trả về JSON đúng schema với notes mô tả rõ lý do.`;

async function callGeminiWithRetry(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string
) {
  const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
  let lastError: unknown;

  for (const modelName of modelsToTry) {
    const maxAttempts = modelName === 'gemini-4-hydrogen' ? 1 : 2;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: 'Hãy đọc toàn bộ thông tin trên hóa đơn tiền điện này và trích xuất chính xác sang định dạng JSON theo schema.',
              },
            ],
          },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            thinkingConfig: {
              thinkingLevel:
                modelName === 'gemini-4-hydrogen'
                  ? ThinkingLevel.MEDIUM
                  : ThinkingLevel.LOW,
            },
            responseMimeType: 'application/json',
            responseSchema: billResponseSchema,
          },
        });
        return response;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable =
          msg.includes('500') ||
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('DEADLINE_EXCEEDED');
        if (!isRetryable) {
          throw err;
        }
        if (attempt + 1 < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/read-bill', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({
          error:
            'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra mục Settings > Secrets.',
        });
        return;
      }

      let base64Data: string = '';
      let mimeType: string = 'image/png';

      if (req.body?.useSample) {
        if (!fs.existsSync(SAMPLE_BILL_PATH)) {
          res.status(404).json({ error: 'Không tìm thấy file hóa đơn mẫu trên máy chủ.' });
          return;
        }
        const fileBuffer = fs.readFileSync(SAMPLE_BILL_PATH);
        base64Data = fileBuffer.toString('base64');
        mimeType = 'image/png';
      } else {
        const rawData = typeof req.body?.imageBase64 === 'string' ? req.body.imageBase64 : '';
        const providedMime = typeof req.body?.mimeType === 'string' ? req.body.mimeType : '';

        if (!rawData) {
          res.status(400).json({ error: 'Thiếu dữ liệu hình ảnh hoặc file PDF hóa đơn.' });
          return;
        }

        // Strip optional data URL prefix if present
        const dataUrlMatch = rawData.match(/^data:([^;]+);base64,(.+)$/);
        if (dataUrlMatch) {
          mimeType = providedMime || dataUrlMatch[1];
          base64Data = dataUrlMatch[2];
        } else {
          mimeType = providedMime || 'image/jpeg';
          base64Data = rawData;
        }
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await callGeminiWithRetry(ai, base64Data, mimeType);
      const rawText = (response.text ?? '').trim();

      if (!rawText) {
        res.status(502).json({ error: 'Hệ thống không nhận được kết quả trích xuất từ mô hình.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({ bill: parsed });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Error reading electricity bill:', errMsg);

      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403')) {
        res.status(403).json({
          error:
            'API key không hợp lệ hoặc chưa đủ quyền truy cập. Vui lòng kiểm tra lại khóa trong phần Settings > Secrets.',
        });
        return;
      }

      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
        res.status(429).json({
          error:
            'Đã vượt quá giới hạn lượt đọc tạm thời (429). Vui lòng đợi vài giây rồi thử lại.',
        });
        return;
      }

      res.status(500).json({
        error: `Không thể đọc hóa đơn: ${errMsg}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
