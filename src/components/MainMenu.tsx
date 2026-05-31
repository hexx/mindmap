import { useCallback, useState } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const handleAction = useCallback(
    (action: () => void) => {
      action();
      closeMenu();
    },
    [closeMenu],
  );

  return (
    <div className="main-menu">
      {isOpen ? <div className="main-menu__overlay" onClick={closeMenu} /> : null}
      <button
        type="button"
        className="main-menu__toggle"
        aria-label="アクションメニュー"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>
      {isOpen ? (
        <div className="main-menu__dropdown" role="menu" aria-label="アクション一覧">
          <button type="button" className="main-menu__item" onClick={() => handleAction(onNew)}>
            新規作成
          </button>
          <button type="button" className="main-menu__item" onClick={() => handleAction(onLayout)}>
            整列
          </button>
          <button type="button" className="main-menu__item" onClick={() => handleAction(onSave)}>
            クラウドに保存
          </button>
          <button type="button" className="main-menu__item" onClick={() => handleAction(onLoad)}>
            クラウドから読込
          </button>
          <button type="button" className="main-menu__item" onClick={() => handleAction(onImport)}>
            インポート
          </button>
          <button type="button" className="main-menu__item" onClick={() => handleAction(onExport)}>
            org-modeでエクスポート
          </button>
        </div>
      ) : null}
    </div>
  );
}
