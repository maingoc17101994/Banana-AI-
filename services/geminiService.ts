import { GoogleGenAI } from "@google/genai";
import { AIModel, AspectRatio, Task } from "../types";

/**
 * Hàm xử lý tạo ảnh từ Gemini API
 * @param task Dữ liệu của task hiện tại
 * @param globalSuffix Chuỗi hậu tố thêm vào prompt
 */
export const generateImageForTask = async (
  task: Task, 
  globalSuffix: string
): Promise<string[]> => {
  // 1. Logic Prompt
  // Thêm hậu tố và tham số aspect ratio vào prompt text để "ép" model tuân thủ tỷ lệ
  const ratioPrompt = `--ar ${task.ratio.replace(':', ' ')}`; 
  const finalPrompt = `${task.prompt} ${globalSuffix} ${ratioPrompt}`.trim();
  const generatedImages: string[] = [];

  // 2. Logic API Key
  // API Key must be obtained exclusively from process.env.API_KEY
  // Note: For gemini-3-pro-image-preview, the key is injected after user selection via window.aistudio
  
  // Debug log
  console.log(`[BananaAI] Model: ${task.baseModel}`);

  // Validation
  // Assume process.env.API_KEY is available as per guidelines. 
  // If it's missing, the SDK or the environment setup is responsible.

  // Khởi tạo client
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 3. Vòng lặp tạo ảnh (do API trả về từng ảnh một)
  for (let i = 0; i < task.batchSize; i++) {
    try {
      const parts: any[] = [{ text: finalPrompt }];

      // Xử lý ảnh tham chiếu (Image-to-Image)
      if (task.refImage) {
        // Tách header base64 (VD: data:image/png;base64,...)
        const matches = task.refImage.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          parts.push({
            inlineData: {
              mimeType: matches[1],
              data: matches[2]
            }
          });
        }
      }

      // Config cho từng model
      // Flash hỗ trợ aspectRatio.
      // Pro hỗ trợ aspectRatio và imageSize.
      // Ta truyền aspectRatio cho cả 2.
      const requestConfig: any = {
        imageConfig: {
          aspectRatio: task.ratio,
        }
      };

      // Gọi API
      console.log(`[BananaAI] Generating batch ${i+1}/${task.batchSize}...`);
      const response = await ai.models.generateContent({
        model: task.baseModel,
        contents: {
          parts: parts
        },
        config: requestConfig
      });

      // Parse kết quả
      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        let foundImage = false;
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imgUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            generatedImages.push(imgUrl);
            foundImage = true;
          }
        }
        if (!foundImage) {
           console.warn("[BananaAI] Response received but no image data found.", response);
        }
      } else {
        throw new Error("API không trả về dữ liệu ảnh hợp lệ.");
      }

    } catch (error: any) {
      console.error("Lỗi khi tạo ảnh:", error);
      
      // Xử lý thông báo lỗi chi tiết hơn
      let msg = error.message || "Lỗi không xác định";
      if (msg.includes('API key not valid') || msg.includes('403') || msg.includes('400')) {
         msg = "API Key không hợp lệ hoặc không có quyền truy cập model này (cần Billing). Vui lòng chọn API Key.";
      } else if (msg.includes('503')) {
         msg = "Server đang bận (Overloaded). Vui lòng thử lại sau.";
      }
      
      throw new Error(msg);
    }
  }

  return generatedImages;
};