
import React from 'react';
import type { ConstructionPlan } from '../types.ts';

interface ProgressChartProps {
  plan: ConstructionPlan;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ plan }) => {
  const { tasks, projectStartDate, projectEndDate, budget } = plan;

  const parseDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

  const getDaysDiff = (date1: Date, date2: Date) => {
    return (date2.getTime() - date1.getTime()) / (1000 * 3600 * 24);
  };

  const startDate = parseDate(projectStartDate);
  const endDate = parseDate(projectEndDate);
  const totalDuration = getDaysDiff(startDate, endDate) || 1;
  const totalCost = budget.total;
  const totalTasks = tasks.length;

  if (totalTasks === 0 || totalDuration <= 0) {
    return <p>Dados insuficientes para gerar o gráfico de progresso.</p>;
  }

  // Generate data points for each day of the project
  const dataPoints = [];
  for (let i = 0; i <= totalDuration; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    
    let cumulativePlannedCost = 0;
    let cumulativeActualCost = 0;
    let completedTasksCount = 0;

    tasks.forEach(task => {
        const taskEndDate = parseDate(task.endDate);
        const taskCost = task.costMaterials + task.costLabor;

        if (taskEndDate <= currentDate) {
            cumulativePlannedCost += taskCost;
            if (task.status === 'Concluído') {
                cumulativeActualCost += taskCost;
                completedTasksCount++;
            }
        }
    });

    dataPoints.push({
      date: currentDate,
      plannedCostPercent: (cumulativePlannedCost / totalCost) * 100,
      actualCostPercent: (cumulativeActualCost / totalCost) * 100,
      progressPercent: (completedTasksCount / totalTasks) * 100,
    });
  }

  const toPath = (points: { x: number, y: number }[]) => {
      if (points.length === 0) return 'M 0 100';
      return 'M ' + points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L ');
  };

  const plannedCostPoints = dataPoints.map((p, i) => ({
      x: (i / totalDuration) * 100,
      y: 100 - p.plannedCostPercent,
  }));

  const actualCostPoints = dataPoints.map((p, i) => ({
      x: (i / totalDuration) * 100,
      y: 100 - p.actualCostPercent,
  }));

  const progressPoints = dataPoints.map((p, i) => ({
      x: (i / totalDuration) * 100,
      y: 100 - p.progressPercent,
  }));

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  const yAxisLabels = [0, 25, 50, 75, 100];
  const xAxisLabels = [0, 0.25, 0.5, 0.75, 1].map(p => ({
      value: formatDate(new Date(startDate.getTime() + totalDuration * p * (1000 * 3600 * 24))),
      pos: p * 100
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Acompanhamento de Custos e Progresso</h2>
      <p className="text-slate-600 mb-6">Compare o custo planejado (linha de base) com o custo real (executado) e o progresso das tarefas.</p>

      <div className="p-4 md:p-6 rounded-xl bg-white shadow-lg border border-slate-200">
        <div className="flex">
          {/* Y-Axis */}
          <div className="flex flex-col justify-between h-64 text-right pr-4">
            {yAxisLabels.slice().reverse().map(label => (
                <span key={label} className="text-xs text-slate-500">{label}%</span>
            ))}
          </div>
          
          <div className="flex-1">
            {/* Chart Area */}
            <div className="relative h-64">
              {/* Grid Lines */}
              {yAxisLabels.map(label => (
                  <div key={label} className="absolute w-full border-t border-dashed border-slate-200" style={{bottom: `${label}%`}}></div>
              ))}
              <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" className="absolute top-0 left-0">
                <path d={toPath(plannedCostPoints)} stroke="#3b82f6" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
                <path d={toPath(actualCostPoints)} stroke="#22c55e" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
                <path d={toPath(progressPoints)} stroke="#f97316" strokeWidth="2" strokeDasharray="4 2" fill="none" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            {/* X-Axis */}
            <div className="flex justify-between mt-2">
                {xAxisLabels.map(label => (
                    <span key={label.value} className="text-xs text-slate-500" style={{ transform: `translateX(${label.pos === 100 ? '-100%' : label.pos === 0 ? '0%' : '-50%'})`, position: 'relative', left: `${label.pos}%`}}>{label.value}</span>
                ))}
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center gap-6 mt-4 pt-4 border-t border-slate-200 text-sm">
            <div className="flex items-center"><span className="w-4 h-1 bg-blue-500 mr-2"></span>Custo Planejado</div>
            <div className="flex items-center"><span className="w-4 h-1 bg-green-500 mr-2"></span>Custo Real</div>
            <div className="flex items-center"><div className="w-4 h-1 mr-2 border-t-2 border-dashed border-orange-500"></div>Progresso (%)</div>
        </div>
      </div>
    </div>
  );
};

export default ProgressChart;
