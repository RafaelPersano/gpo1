



import React, { useState, useMemo, useEffect } from 'react';
// FIX: Changed `import { Session }` to `import type { Session }` to correctly import the Session type.
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import * as db from './services/supabaseService';
import * as XLSX from 'xlsx';

import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import InputSection from './components/InputSection';
import PlanTable from './components/PlanTable';
import BudgetSection from './components/BudgetSection';
import MaterialDeliverySchedule from './components/MaterialDeliverySchedule';
import PaymentSchedule from './components/PaymentSchedule';
import GanttChart from './components/GanttChart';
import AbcCurve from './components/AbcCurve';
import ProjectEvolutionChart from './components/ProjectEvolutionChart';
import ProgressChart from './components/ProgressChart';
import ProposalSection from './components/ProposalSection';
import MarketingPage from './components/MarketingPage';
import BdiCalculator from './components/BdiCalculator';
import UnitCostCalculator from './components/UnitCostCalculator';
import CostBreakdownCalculator from './components/CostBreakdownCalculator';
import DownloadEngineeringPdfButton from './components/DownloadEngineeringPdfButton';
import DownloadInvestorPdfButton from './components/DownloadInvestorPdfButton';
import MarketingSection from './components/MarketingSection';
import Login from './components/Login';
import GenerationProgress from './components/GenerationProgress';
import PricingModal from './components/PricingModal';
import PricingSection from './components/PricingSection';
import FinancialAnalysisSection from './components/FinancialAnalysisSection';
import ProjectManager from './components/ProjectManager';
import InvestmentMatrix from './components/InvestmentMatrix';
import TaxSection from './components/TaxSection';
import AdminPanel from './components/AdminPanel';
import ConfigurationErrorModal from './components/ConfigurationErrorModal';
import Spreadsheet from './components/Spreadsheet';
import ExcelGenerator from './components/ExcelGenerator';
import ShareProposalButton from './components/ShareProposalButton';
import ProposalViewerPage from './components/ProposalViewerPage';
import KnowledgeBase from './components/KnowledgeBase';
import RealEstateProductCreator from './components/RealEstateProductCreator';
import AboutPage from './components/AboutPage';


import { generateFullProjectReport, generateProjectImages } from './services/geminiService';
import type { ConstructionPlan, MarketingMaterials, ConstructionTask, Tab } from './types';

import { SpreadsheetIcon } from './components/icons/SpreadsheetIcon';
import { CogIcon } from './components/icons/CogIcon';
import { DollarSignIcon } from './components/icons/DollarSignIcon';
import { WandIcon } from './components/icons/WandIcon';
import { PdfIcon } from './components/icons/PdfIcon';


interface StampData {
  projectName: string;
  budgetString: string;
  costString: string;
  salePriceString: string;
  profitString: string;
  roiString: string;
  ebitdaString: string;
}

type ProjectImages = Record<string, string>;

interface UserProfileInfo {
  fullName: string | null;
  email: string | null;
}

interface AppRoute {
  path: 'main' | 'proposal';
  projectId: number | null;
}

const PROGRESS_STEPS = [
  'Analisando a descrição do projeto...',
  'Gerando o cronograma de tarefas detalhado...',
  'Calculando a distribuição do orçamento...',
  'Elaborando a proposta comercial e financeira...',
  'Criando o kit de marketing e a imagem do projeto...',
  'Salvando projeto no banco de dados...',
  'Finalizando os relatórios completos...'
];

const getErrorMessage = (error: unknown): string => {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Ocorreu um erro inesperado. Verifique o console para mais detalhes.';
};

const createInitialSpreadsheetData = (): string[][] => {
    const initialData: string[][] = Array(50).fill(null).map(() => Array(15).fill(''));
    initialData[0] = [
      'Etapa', 'Descrição da Tarefa', 'Unidade', 'Quantidade', 'Custo Unitário', 'Custo Total',
      'Data de Início', 'Data de Término', 'Responsável', 'Status', 'Notas', '', '', '', ''
    ];
    initialData[1] = [
      '1.1', 'Limpeza do Terreno', 'm²', '250', '5.00', '1250.00',
      '2024-08-01', '2024-08-03', 'Equipe A', 'Não Iniciado', 'Verificar necessidade de remoção de árvores.', '', '', '', ''
    ];
    return initialData;
};

const transformPlanToSpreadsheetData = (plan: ConstructionPlan): string[][] => {
    const data: string[][] = [];
    const formatCurrency = (value: number) => String(value?.toFixed(2) || '0.00').replace('.', ',');

    data.push(['Plano de Obra - Gerado por GPO.ai', '', '', '', '', '', '', '', '']);
    data.push(['Data de Início Geral:', plan.projectStartDate, '', 'Data de Término Geral:', plan.projectEndDate]);
    data.push([]);

    data.push(['RESUMO DO ORÇAMENTO', '']);
    data.push(['Verba Total', `R$ ${formatCurrency(plan.budget.total)}`]);
    data.push(['Custo de Materiais', `R$ ${formatCurrency(plan.budget.materials)}`]);
    data.push(['Custo de Mão de Obra', `R$ ${formatCurrency(plan.budget.labor)}`]);
    data.push(['Taxa do Gestor', `R$ ${formatCurrency(plan.budget.managerFee)}`]);
    data.push([]);

    data.push(['CRONOGRAMA DE TAREFAS']);
    data.push(['ID', 'Fase', 'Tarefa', 'Descrição', 'Início', 'Término', 'Status', 'Custo Material', 'Custo Mão de Obra', 'Custo Total']);
    plan.tasks.forEach(task => {
        data.push([
            String(task.id),
            task.phase,
            task.taskName,
            task.description,
            task.startDate,
            task.endDate,
            task.status,
            `R$ ${formatCurrency(task.costMaterials)}`,
            `R$ ${formatCurrency(task.costLabor)}`,
            `R$ ${formatCurrency(task.costMaterials + task.costLabor)}`
        ]);
    });
    data.push([]);

    data.push(['ENTREGA DE MATERIAIS']);
    data.push(['ID', 'Material', 'Fornecedor', 'Data de Entrega', 'Status', 'ID Tarefa Rel.']);
    plan.materialDeliveries.forEach(item => {
        data.push([
            String(item.id),
            item.materialName,
            item.supplier,
            item.deliveryDate,
            item.status,
            String(item.relatedTaskId)
        ]);
    });
    data.push([]);

    data.push(['CRONOGRAMA DE PAGAMENTOS']);
    data.push(['ID', 'Descrição', 'Vencimento', 'Categoria', 'Status', 'Valor']);
    plan.paymentSchedule.forEach(item => {
        data.push([
            String(item.id),
            item.description,
            item.dueDate,
            item.category,
            item.status,
            `R$ ${formatCurrency(item.amount)}`
        ]);
    });

    const maxCols = Math.max(...data.map(row => row.length), 10);
    return data.map(row => row.concat(Array(maxCols - row.length).fill('')));
};


const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>({ path: 'main', projectId: null });
  const [showApp, setShowApp] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [userProfileInfo, setUserProfileInfo] = useState<UserProfileInfo>({ fullName: null, email: null });
  const isAuthenticated = !!session;
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const [userInput, setUserInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [projectManagerFee, setProjectManagerFee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [responsibleProfessional, setResponsibleProfessional] = useState('');
  const [payMaterialsWithCard, setPayMaterialsWithCard] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigErrorModal, setShowConfigErrorModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const [projectPlan, setProjectPlan] = useState<ConstructionPlan | null>(null);
  const [projectSummary, setProjectSummary] = useState<string | null>(null);
  const [marketingMaterials, setMarketingMaterials] = useState<MarketingMaterials | null>(null);
  
  const [netProfitMargin, setNetProfitMargin] = useState(22);
  const [baseProjectImages, setBaseProjectImages] = useState<ProjectImages | null>(null);
  const [stampedProjectImages, setStampedProjectImages] = useState<ProjectImages | null>(null);
  
  const [originalProposalText, setOriginalProposalText] = useState<string | null>(null);
  const [editedProposalText, setEditedProposalText] = useState<string | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<string[][]>(createInitialSpreadsheetData());

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [initialView, setInitialView] = useState<'create' | 'excel'>('excel');

  const [bdiIndirectCosts, setBdiIndirectCosts] = useState({
    admin: '2', insurance: '1', guarantee: '0.5', risk: '1.5',
  });
  const [bdiTaxes, setBdiTaxes] = useState({
    irpj: '1.2', csll: '1.08', pis: '0.65', cofins: '3', iss: '5', inss: '4.5',
  });
  
  const handleApiError = (error: unknown, context: string) => {
    const errorMessage = getErrorMessage(error);
    const lowerMessage = errorMessage.toLowerCase();
    const isConfigError = 
        lowerMessage.includes('recursão infinita') || 
        lowerMessage.includes('infinite recursion') ||
        lowerMessage.includes('função de segurança') ||
        lowerMessage.includes('could not find function') ||
        lowerMessage.includes('schema cache') ||
        lowerMessage.includes('does not exist');

    if (isConfigError) {
        setShowConfigErrorModal(true);
    } else {
        setError(errorMessage);
    }
    console.error(`Erro ${context}:`, error);
  };
  
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/proposal\/(\d+)$/);
    if (match && match[1]) {
        setRoute({ path: 'proposal', projectId: Number(match[1]) });
    } else {
        setRoute({ path: 'main', projectId: null });
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchUserProfile = async () => {
        try {
            const profile = await db.fetchUserProfile();
            setUserRole(profile?.role || 'user');
            setTokenBalance(profile?.token_balance ?? 0);
            setUserProfileInfo({
                fullName: profile?.full_name || null,
                email: profile?.email || null
            });
        } catch (error) {
            handleApiError(error, 'ao buscar perfil do usuário');
            setUserRole('user');
            setTokenBalance(0);
            setUserProfileInfo({ fullName: null, email: null });
        }
    };
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
            setShowApp(true);
            fetchUserProfile();
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
            setShowApp(true);
            fetchUserProfile();
        } else {
            setUserRole(null);
            setTokenBalance(null);
            setUserProfileInfo({ fullName: null, email: null });
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && isSupabaseConfigured) {
        fetchProjects();
    } else {
        setProjects([]);
        resetStateToNewProject();
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    let interval: number | undefined;
    if (isLoading && currentStepIndex < PROGRESS_STEPS.length - 1) {
        const intervalDuration = 2500;
        interval = window.setInterval(() => {
            setCurrentStepIndex((prevIndex) => {
                if (prevIndex < PROGRESS_STEPS.length - 1) {
                    return prevIndex + 1;
                }
                clearInterval(interval);
                return prevIndex;
            });
        }, intervalDuration);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isLoading, currentStepIndex]);
  
  useEffect(() => {
    if (projectPlan) {
        setSpreadsheetData(transformPlanToSpreadsheetData(projectPlan));
    } else {
        setSpreadsheetData(createInitialSpreadsheetData());
    }
  }, [projectPlan]);

  const addStampAndLogoToImage = (base64Image: string, stampData: StampData | null): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Image;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            
            ctx.drawImage(img, 0, 0);

            if (stampData) {
                const padding = canvas.width * 0.02;
                const stampWidth = canvas.width * 0.35;
                const lineHeight = canvas.width * 0.015;
                const stampHeight = (lineHeight * 1.6) * 8;
                const stampX = padding;
                const stampY = padding;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(stampX, stampY, stampWidth, stampHeight);
                
                let currentY = stampY + padding / 2;
                
                ctx.font = `bold ${lineHeight * 1.1}px Inter, sans-serif`;
                ctx.fillStyle = 'white';
                ctx.textBaseline = 'top';
                ctx.fillText(stampData.projectName, stampX + padding/2, currentY);
                currentY += lineHeight * 2;
                
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(stampX + padding/2, currentY - lineHeight * 0.5);
                ctx.lineTo(stampX + stampWidth - padding/2, currentY - lineHeight * 0.5);
                ctx.stroke();

                const drawLine = (label: string, value: string) => {
                    ctx.font = `normal ${lineHeight * 0.9}px Inter, sans-serif`;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(label, stampX + padding/2, currentY);

                    ctx.font = `bold ${lineHeight * 0.9}px Inter, sans-serif`;
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'right';
                    ctx.fillText(value, stampX + stampWidth - padding/2, currentY);
                    
                    ctx.textAlign = 'left';
                    currentY += lineHeight * 1.6;
                };

                drawLine('Verba:', stampData.budgetString);
                drawLine('Custo Direto:', stampData.costString);
                drawLine('Preço de Venda:', stampData.salePriceString);
                drawLine('Lucro Líquido (Est.):', stampData.profitString);
                drawLine('ROI (Retorno):', stampData.roiString);
                drawLine('EBITDA (Lucro Op.):', stampData.ebitdaString);
            }

            ctx.font = `bold ${canvas.width * 0.05}px Inter, sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            const logoPadding = canvas.width * 0.02;
            const gpoText = 'GPO';
            const dotText = '.';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillText(gpoText, canvas.width - logoPadding - ctx.measureText(dotText).width + 1, canvas.height - logoPadding + 1);
            ctx.fillText(dotText, canvas.width - logoPadding + 1, canvas.height - logoPadding + 1);
            ctx.fillStyle = 'white';
            ctx.fillText(gpoText, canvas.width - logoPadding - ctx.measureText(dotText).width, canvas.height - logoPadding);
            ctx.fillStyle = '#60a5fa';
            ctx.fillText(dotText, canvas.width - logoPadding, canvas.height - logoPadding);

            resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = (err) => reject(err);
    });
  };

  const fetchProjects = async () => {
    try {
        const userProjects = await db.fetchProjects();
        setProjects(userProjects || []);
    } catch (err) {
        handleApiError(err, 'ao buscar projetos');
    }
  };

  const resetStateToNewProject = () => {
      setSelectedProjectId(null);
      setUserInput('');
      setClientName('');
      setTotalBudget('');
      setProjectManagerFee('');
      setStartDate('');
      setEndDate('');
      setResponsibleProfessional('');
      setPayMaterialsWithCard(false);
      setProjectPlan(null);
      setOriginalProposalText(null);
      setEditedProposalText(null);
      setProjectSummary(null);
      setMarketingMaterials(null);
      setBaseProjectImages(null);
      setStampedProjectImages(null);
      setNetProfitMargin(22);
      setError(null);
      setSpreadsheetData(createInitialSpreadsheetData());
      setActiveTab('overview');
  };

  const handleNewProject = () => {
      resetStateToNewProject();
  };

  const handleSelectProject = async (projectId: number) => {
      setIsLoading(true);
      setError(null);
      try {
          const { projectData, plan, marketingMaterials, projectSummary, proposalText } = await db.fetchFullProject(projectId);
          
          resetStateToNewProject();

          setSelectedProjectId(projectData.id);
          setUserInput(projectData.user_input);
          setClientName(projectData.client_name || '');
          setTotalBudget(String(projectData.total_budget_input || ''));
          setStartDate(projectData.start_date_input ? new Date(projectData.start_date_input).toISOString().split('T')[0] : '');
          setEndDate(projectData.end_date_input ? new Date(projectData.end_date_input).toISOString().split('T')[0] : '');
          setResponsibleProfessional(projectData.responsible_professional || '');
          
          setProjectPlan(plan);
          setOriginalProposalText(proposalText);
          setEditedProposalText(null);
          setProjectSummary(projectSummary);
          setMarketingMaterials(marketingMaterials);
          
          if (marketingMaterials?.stamped_facade_image) {
            setStampedProjectImages({ facade: marketingMaterials.stamped_facade_image });
          } else if (projectSummary) {
              setIsGeneratingImage(true);
              generateProjectImages(projectSummary)
                  .then(baseImages => {
                      setBaseProjectImages(baseImages);
                  })
                  .catch(err => {
                      console.warn("Image generation failed", err);
                  })
                  .finally(() => setIsGeneratingImage(false));
          }
          setActiveTab('overview');
          
      } catch (err) {
          handleApiError(err, 'ao carregar projeto');
          resetStateToNewProject(); 
      } finally {
          setIsLoading(false);
      }
  };

  const handleGenerate = async () => {
    if (isSupabaseConfigured && tokenBalance !== null && tokenBalance <= 0) {
        setError('Você não tem tokens suficientes para gerar um novo projeto. Por favor, escolha um plano para continuar.');
        setShowPricingModal(true);
        return;
    }

    setIsLoading(true);
    setCurrentStepIndex(0);
    setError(null);
    setProjectPlan(null);
    setOriginalProposalText(null);
    setEditedProposalText(null);
    setProjectSummary(null);
    setMarketingMaterials(null);
    setBaseProjectImages(null);
    setStampedProjectImages(null);
    setNetProfitMargin(22);
    setActiveTab('overview');

    try {
        if (isSupabaseConfigured) {
            const newBalance = await db.decrementToken();
            setTokenBalance(newBalance);
        }

        const budget = parseFloat(totalBudget);
        if (isNaN(budget) || budget <= 0) throw new Error("Por favor, insira uma verba total válida.");
        const fee = projectManagerFee ? parseFloat(projectManagerFee) : null;
        if (fee !== null && (isNaN(fee) || fee < 0)) throw new Error("A taxa do gestor, se informada, deve ser um número válido.");
      
        setCurrentStepIndex(0); // Analisando
        const report = await generateFullProjectReport(
            userInput, budget, fee, startDate, endDate, payMaterialsWithCard, responsibleProfessional, clientName
        );
        
        setCurrentStepIndex(1); // Gerando cronograma
        setProjectPlan(report.plan);
        setOriginalProposalText(report.proposalText);
        setCurrentStepIndex(2); // Calculando orçamento
        setProjectSummary(report.projectSummary);
        setMarketingMaterials(report.marketingMaterials);
      
        setCurrentStepIndex(4); // Criando kit de marketing
        setIsGeneratingImage(true);
        const baseImages = await generateProjectImages(report.projectSummary)
            .catch(err => {
                console.warn("Image generation failed", err);
                return null;
            });
        setBaseProjectImages(baseImages);
        setIsGeneratingImage(false);

        const directCostFromReport = report.plan.tasks.reduce((sum, task) => sum + task.costMaterials + task.costLabor, 0);
        
        const tempFinancials = (() => {
            const parse = (val: string) => parseFloat(val) / 100 || 0;
            const totalIndirect = Object.values(bdiIndirectCosts).reduce<number>((sum, val) => sum + parse(String(val)), 0);
            const totalTaxesBDI = Object.values(bdiTaxes).reduce<number>((sum, val) => sum + parse(String(val)), 0);
            const profitMargin = netProfitMargin / 100;
            const denominator = 1 - (totalTaxesBDI + profitMargin);
            if (denominator <= 0 || directCostFromReport <= 0) return null;
            
            const bdiRate = (((1 + totalIndirect) / denominator) - 1);
            const finalPrice = directCostFromReport * (1 + bdiRate);
            const netProfitValue = finalPrice * profitMargin;
            const roi = (netProfitValue / directCostFromReport) * 100;
            const grossMarginValue = finalPrice - directCostFromReport;
            const indirectCostsValue = directCostFromReport * totalIndirect;
            const ebitda = grossMarginValue - indirectCostsValue;
            const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

            return {
                projectName: report.marketingMaterials?.commercialNames[0] || 'Projeto de Construção',
                budgetString: formatCurrency(report.plan.budget.total),
                costString: formatCurrency(directCostFromReport),
                salePriceString: formatCurrency(finalPrice),
                profitString: formatCurrency(netProfitValue),
                roiString: `${roi.toFixed(1)}%`,
                ebitdaString: formatCurrency(ebitda),
            };
        })();

        let stampedFacadeForDb: string | null = null;
        if (baseImages?.facade && tempFinancials) {
            stampedFacadeForDb = await addStampAndLogoToImage(baseImages.facade, tempFinancials);
            setStampedProjectImages({ ...baseImages, facade: stampedFacadeForDb });
        } else if (baseImages) {
            setStampedProjectImages(baseImages);
        }

        if (isSupabaseConfigured) {
            setCurrentStepIndex(5);
            const projectInputs = { userInput, clientName, totalBudget: budget, startDate, endDate, responsibleProfessional };
            const finalMarketingMaterials = { 
                ...report.marketingMaterials,
                stamped_facade_image: stampedFacadeForDb 
            };
            const newProject = await db.saveFullProject(
                projectInputs, report.plan, report.projectSummary, report.proposalText, finalMarketingMaterials
            );
            await fetchProjects();
            setSelectedProjectId(newProject.id);
        }
        setCurrentStepIndex(6);

    } catch (err) {
      handleApiError(err, 'ao gerar plano');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePurchasePlan = async (tokensToAdd: number) => {
    try {
        const newBalance = await db.addTokens(tokensToAdd);
        setTokenBalance(newBalance);
        setShowPricingModal(false);
        setError(null);
    } catch (err) {
        handleApiError(err, 'ao adicionar tokens');
    }
  };

  const handleRegenerateImage = async () => {
      if (!projectSummary) return;
      setIsGeneratingImage(true);
      try {
          const newBaseImages = await generateProjectImages(projectSummary);
          setBaseProjectImages(newBaseImages);
      } catch (err) {
          console.warn("Image regeneration failed", err);
          setError("Falha ao gerar nova imagem.");
      } finally {
          setIsGeneratingImage(false);
      }
  };
  
  const directCost = useMemo(() => {
    if (!projectPlan) return 0;
    return projectPlan.tasks.reduce((sum, task) => sum + task.costMaterials + task.costLabor, 0);
  }, [projectPlan]);

  const projectDurationInDays = useMemo(() => {
    if (!projectPlan?.projectStartDate || !projectPlan?.projectEndDate) return 0;
    const start = new Date(projectPlan.projectStartDate + 'T00:00:00');
    const end = new Date(projectPlan.projectEndDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  }, [projectPlan]);

  const financials = useMemo(() => {
    if (!projectPlan) return null;

    const directCostCalc = directCost;
    const parse = (val: string) => parseFloat(val) / 100 || 0;
    
    const totalIndirect = Object.values(bdiIndirectCosts).reduce<number>((sum, val) => sum + parse(String(val)), 0);
    const totalTaxesBDI = Object.values(bdiTaxes).reduce<number>((sum, val) => sum + parse(String(val)), 0);
    
    const profitMargin = netProfitMargin / 100;

    const denominator = 1 - (totalTaxesBDI + profitMargin);
    
    let finalPrice = 0;
    let bdiRate = 0;
    if (denominator > 0 && directCostCalc > 0) {
      bdiRate = (((1 + totalIndirect) / denominator) - 1);
      finalPrice = directCostCalc * (1 + bdiRate);
    }

    const grossMarginValue = finalPrice - directCostCalc;
    const indirectCostsValue = directCostCalc * totalIndirect;
    const ebitda = grossMarginValue - indirectCostsValue;
    const taxesOnRevenueValue = finalPrice * totalTaxesBDI;
    const netProfitValue = finalPrice * profitMargin;
    const roi = directCostCalc > 0 ? (netProfitValue / directCostCalc) * 100 : 0;
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    return {
        directCost: directCostCalc,
        finalPrice,
        grossMarginValue,
        indirectCostsValue,
        taxesOnRevenueValue,
        netProfitValue,
        bdiRate: bdiRate * 100,
        ebitda,
        roi,
        budgetString: formatCurrency(projectPlan.budget.total),
        costString: formatCurrency(directCostCalc),
        salePriceString: formatCurrency(finalPrice),
        profitString: formatCurrency(netProfitValue),
        roiString: `${roi.toFixed(1)}%`,
        ebitdaString: formatCurrency(ebitda),
        projectName: marketingMaterials?.commercialNames[0] || 'Projeto de Construção',
        bdiBreakdown: {
          indirectCosts: bdiIndirectCosts,
          taxes: bdiTaxes,
          netProfit: netProfitMargin.toString()
        }
    };
  }, [projectPlan, netProfitMargin, marketingMaterials, directCost, bdiIndirectCosts, bdiTaxes]);

  useEffect(() => {
    if (baseProjectImages && baseProjectImages.facade && financials) {
        const stampDataForImage: StampData = {
            projectName: financials.projectName,
            budgetString: financials.budgetString,
            costString: financials.costString,
            salePriceString: financials.salePriceString,
            profitString: financials.profitString,
            roiString: financials.roiString,
            ebitdaString: financials.ebitdaString,
        };
        addStampAndLogoToImage(baseProjectImages.facade, stampDataForImage)
            .then(stampedFacade => {
                setStampedProjectImages({ ...baseProjectImages, facade: stampedFacade });
            })
            .catch(err => {
                console.warn("Failed to add stamp to image", err);
                setStampedProjectImages(baseProjectImages);
            });
    } else if (baseProjectImages) {
        setStampedProjectImages(baseProjectImages);
    }
  }, [baseProjectImages, financials]);

  const updateProposalWithNewPricing = (template: string | null, newFinancials: typeof financials, plan: ConstructionPlan | null): string => {
    if (!template || !newFinancials || !plan) return template || '';

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const newBudgetSummary = `O valor total do investimento para este projeto é de ${formatCurrency(newFinancials.finalPrice)}. Este valor contempla os seguintes custos: Custo de Materiais (${formatCurrency(plan.budget.materials)}), Custo de Mão de Obra (${formatCurrency(plan.budget.labor)}) e Taxa de Gestão (${formatCurrency(plan.budget.managerFee)}).`;
    
    const regex = /(Resumo do Orçamento\n\n)(?:[\s\S]*?)(?=\n\nAnálise Financeira e BDI|\n\nPróximos Passos|\n\nEncerramento)/;

    if (regex.test(template)) {
        return template.replace(regex, `$1${newBudgetSummary}`);
    }

    return template;
  };
  
  const displayProposalText = useMemo(() => {
    if (editedProposalText !== null) {
        return editedProposalText;
    }
    return updateProposalWithNewPricing(originalProposalText, financials, projectPlan);
  }, [originalProposalText, editedProposalText, financials, projectPlan]);
  
  const handleNetProfitMarginChange = (newMargin: number) => {
    if (editedProposalText !== null) {
        if (window.confirm('Alterar a margem de lucro irá redefinir as edições manuais feitas na proposta. Deseja continuar?')) {
            setEditedProposalText(null);
        } else {
            return;
        }
    }
    setNetProfitMargin(newMargin);
  };

  const handleTaskUpdate = async (updatedTask: ConstructionTask) => {
    if (projectPlan) {
        const originalTasks = [...projectPlan.tasks];
        const updatedTasks = projectPlan.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        setProjectPlan({ ...projectPlan, tasks: updatedTasks });
        
        try {
            if (isSupabaseConfigured) {
              await db.updateTask(updatedTask);
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err);
            setError(`Falha ao salvar a alteração da tarefa: ${errorMessage}. A alteração foi desfeita.`);
            setProjectPlan({ ...projectPlan, tasks: originalTasks });
        }
    }
  };

  const handleExportToCsv = () => {
    if (!projectPlan || !financials) return;

    const wb = XLSX.utils.book_new();

    const tasksData = projectPlan.tasks.map(task => ({
        'ID': task.id, 'Fase': task.phase, 'Nome da Tarefa': task.taskName, 'Descrição': task.description, 'Responsável': task.assignee, 'Data de Início': task.startDate, 'Data de Término': task.endDate, 'Status': task.status, 'Dependências': task.dependencies, 'Custo Materiais (R$)': task.costMaterials, 'Custo Mão de Obra (R$)': task.costLabor, 'Custo Total (R$)': task.costMaterials + task.costLabor, 'Notas': task.notes,
    }));
    const wsTasks = XLSX.utils.json_to_sheet(tasksData);
    wsTasks['!cols'] = Object.keys(tasksData[0] || {}).map(key => ({ wch: Math.max(key.length, ...tasksData.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2 }));
    XLSX.utils.book_append_sheet(wb, wsTasks, 'Plano de Tarefas');
    
    const budgetData = [['Categoria', 'Valor (R$)'], ['Verba Total', projectPlan.budget.total], ['Custo de Materiais', projectPlan.budget.materials], ['Custo de Mão de Obra', projectPlan.budget.labor], ['Taxa do Gestor', projectPlan.budget.managerFee]];
    const wsBudget = XLSX.utils.aoa_to_sheet(budgetData);
    wsBudget['!cols'] = [{wch: 20}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, wsBudget, 'Resumo do Orçamento');

    const materialsData = projectPlan.materialDeliveries.map(item => ({
        'ID': item.id, 'Material': item.materialName, 'Fornecedor': item.supplier, 'Data de Entrega': item.deliveryDate, 'ID Tarefa Relacionada': item.relatedTaskId, 'Status': item.status,
    }));
    if (materialsData.length > 0) {
        const wsMaterials = XLSX.utils.json_to_sheet(materialsData);
        wsMaterials['!cols'] = Object.keys(materialsData[0] || {}).map(key => ({ wch: Math.max(key.length, ...materialsData.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2 }));
        XLSX.utils.book_append_sheet(wb, wsMaterials, 'Entrega de Materiais');
    }

    const paymentsData = projectPlan.paymentSchedule.map(item => ({
        'ID': item.id, 'Descrição': item.description, 'Vencimento': item.dueDate, 'Categoria': item.category, 'Status': item.status, 'Valor (R$)': item.amount,
    }));
    if (paymentsData.length > 0) {
        const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
        wsPayments['!cols'] = Object.keys(paymentsData[0] || {}).map(key => ({ wch: Math.max(key.length, ...paymentsData.map(row => String(row[key as keyof typeof row] ?? '').length)) + 2 }));
        XLSX.utils.book_append_sheet(wb, wsPayments, 'Cronograma de Pagamentos');
    }

    const financialsData = [
        ['Métrica', 'Valor'],
        ['Custo Direto Total', financials.directCost],
        ['Taxa BDI (%)', financials.bdiRate],
        ['Preço Final de Venda', financials.finalPrice],
        ['Lucro Líquido Estimado', financials.netProfitValue],
        ['ROI (%)', financials.roi],
    ];
    const wsFinancials = XLSX.utils.aoa_to_sheet(financialsData);
    wsFinancials['!cols'] = [{wch: 25}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, wsFinancials, 'Análise Financeira');
    
    const projectName = marketingMaterials?.commercialNames[0]?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'projeto';
    XLSX.writeFile(wb, `${projectName}_plano_completo.xlsx`);
  };

  const renderInitialView = () => (
    <div className="max-w-4xl mx-auto text-center py-16">
        <div className="flex justify-center items-center gap-8">
            <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-slate-50 transition-all">
                <WandIcon className="w-12 h-12 text-blue-500"/>
                <h2 className="text-2xl font-bold text-slate-800">Criar Projeto Completo</h2>
                <p className="text-slate-600 max-w-sm">Use a IA para gerar um plano de obras, proposta, análises e mais, a partir de uma descrição.</p>
                <button onClick={() => setInitialView('create')} className="mt-4 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700">
                    Começar
                </button>
            </div>
             <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-green-400 hover:bg-slate-50 transition-all">
                <SpreadsheetIcon className="w-12 h-12 text-green-500"/>
                <h2 className="text-2xl font-bold text-slate-800">Gerador Rápido de Excel</h2>
                <p className="text-slate-600 max-w-sm">Descreva sua obra e gere instantaneamente uma planilha de tarefas pronta para download.</p>
                <button onClick={() => setInitialView('excel')} className="mt-4 px-6 py-2 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700">
                    Abrir Gerador
                </button>
            </div>
        </div>
    </div>
  );

  const renderContent = () => {
    if (!projectPlan) {
      if (initialView === 'create') {
        return <InputSection 
                userInput={userInput} onUserInputChange={(e) => setUserInput(e.target.value)}
                clientName={clientName} onClientNameChange={(e) => setClientName(e.target.value)}
                totalBudget={totalBudget} onTotalBudgetChange={(e) => setTotalBudget(e.target.value)}
                projectManagerFee={projectManagerFee} onProjectManagerFeeChange={(e) => setProjectManagerFee(e.target.value)}
                startDate={startDate} onStartDateChange={(e) => setStartDate(e.target.value)}
                endDate={endDate} onEndDateChange={(e) => setEndDate(e.target.value)}
                responsibleProfessional={responsibleProfessional} onResponsibleProfessionalChange={(e) => setResponsibleProfessional(e.target.value)}
                payMaterialsWithCard={payMaterialsWithCard} onPayMaterialsWithCardChange={(e) => setPayMaterialsWithCard(e.target.checked)}
                onGenerate={handleGenerate} 
                isLoading={isLoading} 
              />;
      }
      if (initialView === 'excel') {
        return <ExcelGenerator />;
      }
      return renderInitialView();
    }
    
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <BudgetSection budget={projectPlan.budget} tasks={projectPlan.tasks} />
            <ProgressChart plan={projectPlan} />
            <GanttChart tasks={projectPlan.tasks} />
            <ProjectEvolutionChart tasks={projectPlan.tasks} projectStartDate={projectPlan.projectStartDate} projectEndDate={projectPlan.projectEndDate} />
          </div>
        );
      case 'proposal':
        return (
          <div className="space-y-8">
            {financials && <PricingSection financials={financials} netProfitMargin={netProfitMargin} onMarginChange={handleNetProfitMarginChange} />}
            {displayProposalText && financials && (
              <ProposalSection
                proposalText={displayProposalText}
                onTextChange={setEditedProposalText}
                projectImages={stampedProjectImages}
                onRegenerateImage={handleRegenerateImage}
                isGeneratingImage={isGeneratingImage}
                financials={financials}
                projectPlan={projectPlan}
                projectDurationInDays={projectDurationInDays}
              />
            )}
             {marketingMaterials && <MarketingSection materials={marketingMaterials} projectImages={stampedProjectImages} />}
          </div>
        );
      case 'tables':
        return (
            <div className="space-y-8">
                <PlanTable tasks={projectPlan.tasks} onTaskUpdate={handleTaskUpdate} />
                <MaterialDeliverySchedule deliveries={projectPlan.materialDeliveries} />
                <PaymentSchedule schedule={projectPlan.paymentSchedule} />
            </div>
        );
      case 'analysis':
        return (
            <div className="space-y-12">
                <AbcCurve tasks={projectPlan.tasks} />
                {financials && <BdiCalculator 
                    directCost={directCost}
                    indirectCosts={bdiIndirectCosts}
                    setIndirectCosts={setBdiIndirectCosts}
                    taxes={bdiTaxes}
                    setTaxes={setBdiTaxes}
                    profit={netProfitMargin}
                    setProfit={handleNetProfitMarginChange}
                />}
                {financials && <FinancialAnalysisSection financials={financials} />}
                {financials && <InvestmentMatrix financials={financials} projectDurationInDays={projectDurationInDays} />}
                {financials && <TaxSection financials={financials} projectPlan={projectPlan} />}
                <UnitCostCalculator />
                <CostBreakdownCalculator />
                <RealEstateProductCreator />
            </div>
        );
      case 'spreadsheet':
        return <Spreadsheet data={spreadsheetData} onDataChange={setSpreadsheetData} />;
      case 'excel':
        return <ExcelGenerator />;
      case 'admin':
        return userRole === 'admin' ? <AdminPanel /> : <p>Acesso negado.</p>;
      case 'knowledge':
          return <KnowledgeBase />;
      case 'about':
        return <AboutPage />;
      default:
        return <div>Selecione uma aba</div>;
    }
  };

  const MainApp = () => (
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onStart={() => setShowApp(false)} 
          isAppView={true} 
          isAuthenticated={isAuthenticated}
          onLogout={() => supabase.auth.signOut()}
          onGoToHome={() => resetStateToNewProject()}
          tokenBalance={tokenBalance}
          userProfileInfo={userProfileInfo}
          userRole={userRole}
          isSupabaseConfigured={isSupabaseConfigured}
          onEnterDemoMode={() => {
              setIsGuest(true);
              setShowApp(true);
          }}
        />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {isLoading && !projectPlan ? (
            <GenerationProgress steps={PROGRESS_STEPS} currentStepIndex={currentStepIndex} />
          ) : (
            <>
              {error && <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">{error}</div>}
              {isSupabaseConfigured && isAuthenticated && <ProjectManager projects={projects} selectedProjectId={selectedProjectId} onSelectProject={handleSelectProject} onNewProject={handleNewProject} />}
              
              <div className="max-w-7xl mx-auto">
                {renderContent()}
              </div>
              
              {projectPlan && financials && (
                 <div className="fixed bottom-6 right-6 z-40 flex flex-col md:flex-row gap-4">
                     {selectedProjectId && <ShareProposalButton projectId={selectedProjectId} />}
                     <DownloadEngineeringPdfButton projectPlan={projectPlan} icon={<PdfIcon className="w-5 h-5 mr-2" />} />
                     <DownloadInvestorPdfButton 
                        projectPlan={projectPlan} 
                        financials={financials}
                        proposalText={displayProposalText}
                        projectImages={stampedProjectImages}
                        responsibleProfessional={responsibleProfessional}
                        clientName={clientName}
                        icon={<PdfIcon className="w-5 h-5 mr-2" />} 
                        projectDurationInDays={projectDurationInDays}
                     />
                    <button
                        onClick={handleExportToCsv}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                       <SpreadsheetIcon className="w-5 h-5 mr-2" />
                       Exportar Completo (.xlsx)
                    </button>
                 </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );

  const renderRoute = () => {
      if (route.path === 'proposal' && route.projectId) {
          return <ProposalViewerPage projectId={route.projectId} />;
      }
      if (showApp || isGuest) {
          return <MainApp />;
      }
      if (!isSupabaseConfigured) {
          return (
            <>
                <Header onStart={() => setShowApp(true)} isAppView={false} isAuthenticated={false} onLogout={() => {}} onGoToHome={() => setShowApp(false)} tokenBalance={null} userProfileInfo={{fullName:null, email:null}} userRole={null} isSupabaseConfigured={false} onEnterDemoMode={() => {}}/>
                <MarketingPage onStart={() => setShowApp(true)} isBackendConfigured={false} />
                <Footer />
            </>
          )
      }
      return (
        <>
            <Header onStart={() => setShowApp(true)} isAppView={false} isAuthenticated={false} onLogout={() => {}} onGoToHome={() => setShowApp(false)} tokenBalance={null} userProfileInfo={{fullName:null, email:null}} userRole={null} isSupabaseConfigured={true} onEnterDemoMode={() => {}}/>
            <Login onGoToHome={() => setShowApp(false)} isBackendConfigured={true} onEnterDemoMode={() => { setIsGuest(true); setShowApp(true); }}/>
            <Footer />
        </>
      )
  };
  
  return (
    <>
        {renderRoute()}
        {showPricingModal && <PricingModal show={showPricingModal} onClose={() => setShowPricingModal(false)} onPurchasePlan={handlePurchasePlan} />}
        {showConfigErrorModal && <ConfigurationErrorModal show={showConfigErrorModal} onClose={() => setShowConfigErrorModal(false)} />}
    </>
  );
};

export default App;