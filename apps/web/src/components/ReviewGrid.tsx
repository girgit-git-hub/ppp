import {AgGridReact} from 'ag-grid-react';
import {ModuleRegistry, AllCommunityModule} from 'ag-grid-community';
import type {ColDef} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([AllCommunityModule]);

export function ReviewGrid({rows,onSelect}:{rows:any[],onSelect:(row:any)=>void}){
  const cols:ColDef[]=[
    {field:'id',headerName:'Task',width:150},
    {field:'title',flex:1},
    {field:'amount',headerName:'Amount',valueFormatter:p=>`${p.data?.currency||'USD'} ${p.value}`},
    {field:'status'},
    {field:'verification.overallScore',headerName:'Proof score'},
    {field:'verification.decision',headerName:'AI decision'},
    {field:'payout.status',headerName:'Payout'}
  ];
  return <div className="ag-theme-quartz-dark grid"><AgGridReact rowData={rows} columnDefs={cols} onRowClicked={e=>e.data&&onSelect(e.data)} pagination paginationPageSize={8}/></div>;
}
