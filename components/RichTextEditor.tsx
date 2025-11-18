// Componente de editor rico para FAQ usando TipTap
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from './ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Youtube,
  File,
  Undo,
  Redo,
} from 'lucide-react';
import { storageService } from '../services/storageService';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  faqId?: string; // Para upload de arquivos
  onAttachmentAdd?: (attachment: { type: 'image' | 'file' | 'video' | 'link'; url: string; filename?: string; size?: number }) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Digite sua resposta aqui...',
  faqId = 'new',
  onAttachmentAdd,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const uploadAndInsertImage = async (file: File, showLoading = true) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (showLoading) {
      setIsUploading(true);
    }
    try {
      const url = await storageService.uploadFAQImage(file, faqId);
      editor?.chain().focus().setImage({ src: url }).run();
      
      if (onAttachmentAdd) {
        onAttachmentAdd({
          type: 'image',
          url,
          filename: file.name,
          size: file.size,
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    } finally {
      if (showLoading) {
        setIsUploading(false);
      }
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Permitir múltiplas imagens
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      try {
        // Upload de múltiplas imagens
        for (let i = 0; i < files.length; i++) {
          await uploadAndInsertImage(files[i], false); // Não mostrar loading individual
        }
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleFileUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await storageService.uploadFAQFile(file, faqId);
        
        // Inserir link no editor
        editor?.chain().focus().insertContent(`<a href="${result.url}" target="_blank" rel="noopener noreferrer">${file.name}</a>`).run();
        
        if (onAttachmentAdd) {
          onAttachmentAdd({
            type: 'file',
            url: result.url,
            filename: file.name,
            size: result.size,
          });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Erro ao fazer upload do arquivo. Tente novamente.');
      }
    };
    input.click();
  };

  const handleVideoInsert = () => {
    const url = prompt('Cole a URL do vídeo (YouTube ou Vimeo):');
    if (!url) return;

    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    
    if (youtubeRegex.test(url) || vimeoRegex.test(url)) {
      editor?.chain().focus().insertContent(`<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`).run();
      
      if (onAttachmentAdd) {
        onAttachmentAdd({
          type: 'video',
          url,
        });
      }
    } else {
      alert('URL inválida. Use links do YouTube ou Vimeo.');
    }
  };

  const handleLinkInsert = () => {
    const url = prompt('Cole a URL do link:');
    if (!url) return;

    // Se houver texto selecionado, transformar em link
    if (editor && !editor.state.selection.empty) {
      editor.chain().focus().setLink({ href: url }).run();
      
      if (onAttachmentAdd) {
        const selectedText = editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to
        );
        onAttachmentAdd({
          type: 'link',
          url,
          filename: selectedText || url,
        });
      }
    } else {
      // Se não houver seleção, inserir link completo
      const text = prompt('Texto do link (opcional):') || url;
      editor?.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`).run();
      
      if (onAttachmentAdd) {
        onAttachmentAdd({
          type: 'link',
          url,
          filename: text,
        });
      }
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/50 p-2 flex flex-wrap gap-1">
        {/* Formatação de texto */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-muted' : ''}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Listas */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Títulos */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
        >
          H1
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
        >
          H2
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
        >
          H3
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Mídia */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          title="Inserir imagem"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLinkInsert}
          title="Inserir link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleVideoInsert}
          title="Inserir vídeo"
        >
          <Youtube className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleFileUpload}
          title="Anexar arquivo"
        >
          <File className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Desfazer/Refazer */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        className={`min-h-[300px] max-h-[600px] overflow-y-auto relative ${
          isDragging ? 'border-2 border-primary bg-primary/5' : ''
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) {
            setIsDragging(true);
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Só desativar se realmente sair da área do editor
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX;
          const y = e.clientY;
          if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            setIsDragging(false);
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);

          const files = Array.from(e.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));

          if (imageFiles.length === 0 && files.length > 0) {
            alert('Por favor, arraste apenas arquivos de imagem.');
            return;
          }

          if (imageFiles.length > 0) {
            setIsUploading(true);
            try {
              // Upload de múltiplas imagens
              for (const file of imageFiles) {
                await uploadAndInsertImage(file, false); // Não mostrar loading individual
              }
            } finally {
              setIsUploading(false);
            }
          }
        }}
      >
        <EditorContent editor={editor} />
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
              <p className="text-primary font-medium">Solte a imagem aqui</p>
            </div>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Fazendo upload...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

