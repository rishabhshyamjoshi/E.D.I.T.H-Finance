import { useState } from 'react';
import { FinanceProfile, orchestrateFinancePlan, generateExplanation, verifyNumbers, generateChallenge } from '../services/financeEngine';

export type AgentType = 'Orchestrator' | 'Explainer' | 'Verifier' | 'Challenger' | 'Complete' | null;

export interface TerminalLog {
  id: string;
  text: string;
  type: 'info' | 'data' | 'success' | 'error';
}

export interface ReportData {
  rawPlan: string;
  expl: string;
  verif: any;
  chal: string;
}

export const useAgentOrchestrator = (onFlowComplete?: (report: ReportData) => void) => {
  const [activeAgent, setActiveAgent] = useState<AgentType>(null);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const addTermLog = (text: string, type: 'info' | 'data' | 'success' | 'error' = 'info') => {
    setTerminalLogs(prev => [...prev, { id: Math.random().toString(36).substring(7), text, type }]);
  };

  const resetAgentState = () => {
    setActiveAgent(null);
    setTerminalLogs([]);
    setReportData(null);
  };

  const runAgentFlow = async (targetProfile: FinanceProfile | null, clearLogs: boolean = true) => {
    if (!targetProfile) return;
    if (clearLogs) setTerminalLogs([]);
    setReportData(null);
    
    try {
      // Step 1: Orchestrator
      setActiveAgent('Orchestrator');
      addTermLog("Orchestrator started: Analyzing profile and generating base plans...", "info");
      const rawPlan = await orchestrateFinancePlan(targetProfile, [], (msg) => addTermLog(msg, "error"));
      addTermLog("Orchestrator finished generating raw plans.", "success");
      
      // Step 2 & 3: Explainer and Challenger (Parallel)
      setActiveAgent('Explainer');
      addTermLog("Explainer and Challenger started in parallel...", "info");
      
      const [expl, chal] = await Promise.all([
        generateExplanation(rawPlan, (msg) => addTermLog(msg, "error")),
        generateChallenge(targetProfile, rawPlan, (msg) => addTermLog(msg, "error"))
      ]);
      
      addTermLog("Explainer and Challenger completed their tasks.", "success");
      
      // Step 4: Verifier
      setActiveAgent('Verifier');
      addTermLog("Verifier started: Auditing numbers and checking for hallucinations...", "info");
      const verif = await verifyNumbers(rawPlan, expl, (msg) => addTermLog(msg, "error"));
      addTermLog(verif.message, verif.verified ? "success" : "error");
      
      // Complete
      setActiveAgent('Complete');
      addTermLog("Agent flow completed successfully.", "success");
      const finalReport = { rawPlan, expl, verif, chal };
      setReportData(finalReport);
      
      if (onFlowComplete) {
        onFlowComplete(finalReport);
      }
    } catch (err: any) {
      addTermLog(`Agent flow error: ${err.message}`, "error");
      setActiveAgent(null);
    }
  };

  return {
    activeAgent,
    terminalLogs,
    reportData,
    setReportData,
    runAgentFlow,
    resetAgentState,
    addTermLog,
  };
};
