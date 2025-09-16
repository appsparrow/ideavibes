import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string | ReactNode;
  actions?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, subtitle, badge, actions, className = "" }: PageHeaderProps) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 ${className}`}>
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
          {badge && (
            <div className="flex items-center gap-2">
              {typeof badge === 'string' ? (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  {badge}
                </span>
              ) : (
                badge
              )}
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-muted-foreground text-sm sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
