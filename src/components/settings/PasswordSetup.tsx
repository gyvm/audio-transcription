import React from 'react';

export const PasswordSetup: React.FC = () => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
      <p className="text-sm text-gray-600">
        システムが自動的に暗号化キーを管理しています。手動設定は不要です。
      </p>
    </div>
  );
};