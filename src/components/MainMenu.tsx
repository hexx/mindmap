import { Menu, Plus, LayoutDashboard, CloudUpload, CloudDownload, FileUp, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type MainMenuProps = {
  onNew: () => void;
  onLayout: () => void;
  onSave: () => void;
  onLoad: () => void;
  onImport: () => void;
  onExport: () => void;
};

export default function MainMenu({
  onNew,
  onLayout,
  onSave,
  onLoad,
  onImport,
  onExport,
}: MainMenuProps) {
  return (
    <div className="absolute top-4 right-4 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" className="size-12 rounded-full shadow-lg">
            <Menu className="size-5" />
            <span className="sr-only">アクションメニュー</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onNew}>
              <Plus className="mr-2 size-4" />
              新規作成
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLayout}>
              <LayoutDashboard className="mr-2 size-4" />
              整列
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onSave}>
              <CloudUpload className="mr-2 size-4" />
              クラウドに保存
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLoad}>
              <CloudDownload className="mr-2 size-4" />
              クラウドから読込
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onImport}>
              <FileUp className="mr-2 size-4" />
              インポート
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <FileDown className="mr-2 size-4" />
              org-modeでエクスポート
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
