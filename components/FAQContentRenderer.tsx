// Componente para renderizar conteúdo rico de FAQ (HTML, imagens, vídeos, links, arquivos)
import React from 'react';
import DOMPurify from 'dompurify';
import { FAQEntry, FAQAttachment } from '../types';
import { Download, ExternalLink, File, Image as ImageIcon, Video } from 'lucide-react';

interface FAQContentRendererProps {
  content: string; // HTML content
  attachments?: FAQAttachment[];
  className?: string;
}

// Configuração de sanitização do DOMPurify
const sanitizeConfig = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
    'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'iframe', 'video', 'audio',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel', 'src', 'alt', 'title', 'width', 'height',
    'class', 'style', 'id', 'data-*',
    'frameborder', 'allow', 'allowfullscreen', 'controls', 'autoplay', 'loop',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

export const FAQContentRenderer: React.FC<FAQContentRendererProps> = ({
  content,
  attachments = [],
  className = '',
}) => {
  // Sanitizar HTML
  const sanitizedHTML = DOMPurify.sanitize(content, sanitizeConfig);

  // Processar URLs de vídeo para embed
  const processVideoUrl = (url: string): string | null => {
    // YouTube
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  // Renderizar anexo
  const renderAttachment = (attachment: FAQAttachment, index: number) => {
    switch (attachment.type) {
      case 'image':
        return (
          <div key={index} className="my-4">
            <img
              src={attachment.url}
              alt={attachment.filename || 'Imagem'}
              className="max-w-full h-auto rounded-lg shadow-md object-contain"
              style={{ maxHeight: '500px' }}
              loading="lazy"
            />
            {attachment.filename && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {attachment.filename}
              </p>
            )}
          </div>
        );

      case 'video':
        const embedUrl = processVideoUrl(attachment.url);
        if (embedUrl) {
          return (
            <div key={index} className="my-4">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={embedUrl}
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={attachment.filename || 'Vídeo'}
                />
              </div>
              {attachment.filename && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {attachment.filename}
                </p>
              )}
            </div>
          );
        }
        // Fallback para vídeo direto
        return (
          <div key={index} className="my-4">
            <video
              src={attachment.url}
              controls
              className="max-w-full h-auto rounded-lg shadow-md"
              style={{ maxHeight: '500px' }}
            >
              Seu navegador não suporta vídeo.
            </video>
            {attachment.filename && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {attachment.filename}
              </p>
            )}
          </div>
        );

      case 'file':
        const formatFileSize = (bytes?: number): string => {
          if (!bytes) return '';
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        };

        return (
          <div key={index} className="my-4 p-4 border border-border rounded-lg bg-muted/30 flex items-center gap-3">
            <File className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{attachment.filename || 'Arquivo'}</p>
              {attachment.size && (
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              )}
            </div>
            <a
              href={attachment.url}
              download={attachment.filename}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm shrink-0"
            >
              <Download className="h-4 w-4" />
              Baixar
            </a>
          </div>
        );

      case 'link':
        return (
          <div key={index} className="my-4">
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-sm">{attachment.filename || attachment.url}</span>
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`faq-content ${className}`}>
      {/* Conteúdo HTML sanitizado */}
      <div
        className="prose prose-sm max-w-none dark:prose-invert [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-md [&_img]:my-4 [&_iframe]:max-w-full [&_iframe]:rounded-lg [&_a]:text-primary [&_a]:underline [&_a:hover]:opacity-80 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:p-2"
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />

      {/* Anexos */}
      {attachments && attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          {attachments.map((attachment, index) => renderAttachment(attachment, index))}
        </div>
      )}

    </div>
  );
};

