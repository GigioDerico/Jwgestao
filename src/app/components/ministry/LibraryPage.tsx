import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const JW_LINKS = [
  { label: 'jw.org', url: 'https://www.jw.org' },
  { label: 'Biblioteca Online', url: 'https://www.jw.org/pt/biblioteca/' },
  { label: 'Publicações', url: 'https://www.jw.org/pt/publicacoes/' },
  { label: 'Vídeos', url: 'https://www.jw.org/pt/videos/' },
  { label: 'Música', url: 'https://www.jw.org/pt/musica/' },
];

const BIBLE_THEMES: { theme: string; refs: string[] }[] = [
  { theme: 'Esperança', refs: ['Romanos 15:13', 'Jeremias 29:11', 'Revelação 21:4'] },
  { theme: 'Sofrimento', refs: ['2 Coríntios 4:17, 18', 'Romanos 8:18', 'Salmos 34:19'] },
  { theme: 'Família', refs: ['Efésios 6:1-4', 'Provérbios 22:6', 'Colossenses 3:18-21'] },
  { theme: 'Reino de Deus', refs: ['Mateus 6:10', 'Daniel 2:44', 'Isaías 9:6, 7'] },
];

export function LibraryPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-foreground">Biblioteca de Apoio</h2>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base">Links oficiais (jw.org)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {JW_LINKS.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline py-1"
            >
              <ExternalLink size={14} />
              {link.label}
            </a>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base">Textos bíblicos por tema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {BIBLE_THEMES.map((item) => (
            <div key={item.theme}>
              <p className="font-medium text-foreground text-sm">{item.theme}</p>
              <p className="text-sm text-muted-foreground">{item.refs.join(' • ')}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-border rounded-xl shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-base">Sugestões de apresentações breves</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use o tema do mês em <a href="https://www.jw.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">jw.org</a> para preparar uma apresentação breve. 
            Escolha um texto bíblico relacionado e prepare uma pergunta ou comentário que incentive a reflexão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
