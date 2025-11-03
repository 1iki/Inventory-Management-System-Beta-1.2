import React from 'react';
import { Clock, User, Activity } from 'lucide-react';
import { useInventoryStore } from '../store/inventory';
import { format } from 'date-fns';
import type { AuditLog as AuditLogType } from '../types';

const AuditLog: React.FC = () => {
  const { auditLogs } = useInventoryStore();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ITEM_CREATED':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'ITEM_OUT':
        return <Activity className="h-4 w-4 text-red-500" />;
      case 'MASTER_CREATED':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'DELETE_APPROVED':
        return <Activity className="h-4 w-4 text-orange-500" />;
      case 'DELETE_REJECTED':
        return <Activity className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'ITEM_CREATED':
        return 'bg-blue-100 text-blue-800';
      case 'ITEM_OUT':
        return 'bg-red-100 text-red-800';
      case 'MASTER_CREATED':
        return 'bg-green-100 text-green-800';
      case 'DELETE_APPROVED':
        return 'bg-orange-100 text-orange-800';
      case 'DELETE_REJECTED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Audit Log</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Clock className="inline h-4 w-4 mr-1" />
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <User className="inline h-4 w-4 mr-1" />
                Username
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <Activity className="inline h-4 w-4 mr-1" />
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditLogs.map((log: AuditLogType, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                  {format(new Date(log.timestamp || new Date()), 'yyyy-MM-dd HH:mm:ss')}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 mr-2">
                      {log.username.substring(0, 2).toUpperCase()}
                    </div>
                    {log.username}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getActionIcon(log.action)}
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 max-w-md">
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {auditLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Belum ada log aktivitas</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;