// Serviço para gerenciar uploads e downloads no Firebase Storage
import { storage } from '../firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadResult,
} from 'firebase/storage';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
];

export const storageService = {
  /**
   * Upload de imagem para FAQ
   */
  uploadFAQImage: async (file: File, faqId: string): Promise<string> => {
    try {
      // Validar tipo
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(`Tipo de arquivo não permitido. Use: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
      }

      // Validar tamanho
      if (file.size > MAX_IMAGE_SIZE) {
        throw new Error(`Imagem muito grande. Tamanho máximo: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      }

      // Gerar nome único
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = `faq/images/${faqId}/${filename}`;

      // Upload
      const storageRef = ref(storage, path);
      const uploadResult: UploadResult = await uploadBytes(storageRef, file);

      // Obter URL pública
      const downloadURL = await getDownloadURL(uploadResult.ref);

      return downloadURL;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[storageService] Error uploading FAQ image:', {
        filename: file.name,
        faqId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Upload de arquivo para FAQ
   */
  uploadFAQFile: async (file: File, faqId: string): Promise<{ url: string; size: number }> => {
    try {
      // Validar tipo
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error(`Tipo de arquivo não permitido. Use: PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP`);
      }

      // Validar tamanho
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Gerar nome único
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = `faq/files/${faqId}/${filename}`;

      // Upload
      const storageRef = ref(storage, path);
      const uploadResult: UploadResult = await uploadBytes(storageRef, file);

      // Obter URL pública
      const downloadURL = await getDownloadURL(uploadResult.ref);

      return {
        url: downloadURL,
        size: file.size,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[storageService] Error uploading FAQ file:', {
        filename: file.name,
        faqId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Deletar arquivo do Storage
   */
  deleteFile: async (url: string): Promise<void> => {
    try {
      // Extrair path da URL
      const urlObj = new URL(url);
      const path = decodeURIComponent(urlObj.pathname.split('/o/')[1]?.split('?')[0] || '');

      if (!path) {
        throw new Error('Não foi possível extrair o path da URL');
      }

      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[storageService] Error deleting file:', {
        url,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Obter URL pública de um arquivo
   */
  getFileUrl: async (path: string): Promise<string> => {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[storageService] Error getting file URL:', {
        path,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Validar se URL é de imagem
   */
  isImageUrl: (url: string): boolean => {
    return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
  },

  /**
   * Validar se URL é de vídeo
   */
  isVideoUrl: (url: string): boolean => {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) || 
           /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
  },
};



