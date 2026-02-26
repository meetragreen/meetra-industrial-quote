import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    // Text Fields
    customerName: '', 
    location: '', 
    plantCapacity: '', 
    startSeq: '', 

    // Manual Inputs for Calculation
    systemRate: '',      
    structureRate: '',  
    
    // Dropdowns & Defaults
    panelType: 'Topcon', 
    panelMake: 'Adani',  
    inverterMake: 'Deye',
    laType: 'Conventional', 
    
    // --- NEW FIELDS ---
    mountingType: 'Structure',   
    mountingDetails: '', 
    panelWattage: '',
    panelQty: '',
    inverterCapacity: '',
    structureMake: '',   
    structureQty: '',    
    inverterWarranty: '',

    // Auto-Calculated Fields
    systemCost: '0',     
    gstAmount: '0',      
    structureCost: '0',  
    totalAmount: '0'     
  });

  const [hasTemplate, setHasTemplate] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- 1. CALCULATOR ENGINE ---
  useEffect(() => {
    const cap = parseFloat(formData.plantCapacity) || 0;       
    const sysRate = parseFloat(formData.systemRate) || 0;      
    const structRate = parseFloat(formData.structureRate) || 0;

    const sysCost = (sysRate * cap);
    const gst = (sysCost * 0.089);
    const structCost = (cap * structRate);
    const total = sysCost + gst + structCost;

    setFormData(prev => ({
      ...prev,
      systemCost: sysCost.toFixed(2),
      gstAmount: gst.toFixed(2),
      structureCost: structCost.toFixed(2),
      totalAmount: total.toFixed(2)
    }));

  }, [formData.plantCapacity, formData.systemRate, formData.structureRate]);

  // --- 2. TEMPLATE CHECK ---
  useEffect(() => { checkServerTemplate(); }, []);

  const checkServerTemplate = async () => {
    try {
      const res = await axios.get('https://meetra-industrial-quote-nqm4.onrender.com/check-template');
      setHasTemplate(res.data.exists);
    } catch (error) { console.error("Server offline?"); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const uploadData = new FormData();
    uploadData.append('templatePdf', file);
    try {
      await axios.post('https://meetra-industrial-quote-nqm4.onrender.com/upload-template', uploadData);
      alert("Template Saved!");
      setHasTemplate(true);
    } catch (error) { alert("Error uploading"); }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDownload = async () => {
    if (!hasTemplate) { alert("Please Upload Template first!"); return; }
    setLoading(true);
    try {
      const response = await axios.post('https://meetra-industrial-quote-nqm4.onrender.com/generate-quotation', formData, {
        responseType: 'blob', 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Quotation_${formData.customerName}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clear the manual sequence after use so it goes back to auto
      setFormData(prev => ({ ...prev, startSeq: '' }));

    } catch (error) { console.error("Error:", error); alert("Error generating PDF"); }
    setLoading(false);
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial", background: "#f4f4f4", minHeight: "100vh" }}>
      <div style={{ maxWidth: "600px", margin: "auto", background: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
        
        <h2 style={{ color: "#2E7D32", textAlign: "center" }}>Meetra Green Calculator</h2>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
            {hasTemplate ? <span style={{color: "green", fontWeight: "bold"}}>✅ Template Ready</span> : <span style={{color: "red"}}>❌ Upload Template</span>}
            <br/>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} style={{marginTop:"5px"}}/>
        </div>

        {/* --- SECTION 1: BASIC DETAILS --- */}
        <h4 style={sectionHeader}>1. Project Details</h4>
        <div style={rowStyle}>
          <div style={{flex:1, marginRight: "10px"}}>
            <label style={labelStyle}>Customer Name</label>
            <input style={inputStyle} name="customerName" value={formData.customerName} onChange={handleChange} />
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>Location</label>
            <input style={inputStyle} name="location" value={formData.location} onChange={handleChange} />
          </div>
        </div>

        {/* MANUAL SEQUENCE & CAPACITY */}
        <div style={rowStyle}>
            <div style={{flex:1, marginRight: "10px"}}>
                <label style={labelStyle}>Plant Capacity (kW)</label>
                <input style={inputStyle} name="plantCapacity" placeholder="e.g. 9.52" value={formData.plantCapacity} onChange={handleChange} />
            </div>
            <div style={{flex:1}}>
                <label style={{...labelStyle, color: "#d32f2f"}}>Set Quotation No. (Optional)</label>
                <input 
                    style={{...inputStyle, borderColor: "#d32f2f"}} 
                    name="startSeq" 
                    placeholder="Auto (or type e.g. 3)" 
                    value={formData.startSeq}
                    onChange={handleChange} 
                />
            </div>
        </div>

        {/* --- SECTION 2: TECHNICAL DETAILS --- */}
        <h4 style={sectionHeader}>2. Technical Specs</h4>
        
        {/* ROW 1: Panel Make & Type (UPDATED: Datalist for manual entry) */}
        <div style={rowStyle}>
          <div style={{flex:1, marginRight: "10px"}}>
             <label style={labelStyle}>Panel Make</label>
             <input 
                style={inputStyle} 
                name="panelMake" 
                list="panel-makes"
                value={formData.panelMake}
                onChange={handleChange} 
                placeholder="Select or type..."
             />
             <datalist id="panel-makes">
                <option value="Adani" /><option value="Goldi" /><option value="Rayzon" /><option value="UTL" /><option value="Waaree" />
             </datalist>
          </div>
          <div style={{flex:1}}>
             <label style={labelStyle}>Panel Type</label>
             <select style={inputStyle} name="panelType" value={formData.panelType} onChange={handleChange}>
                <option>Topcon</option><option>Bifacial</option><option>HJT</option>
             </select>
          </div>
        </div>

        {/* ROW 2: Panel Wattage & Qty */}
        <div style={rowStyle}>
          <div style={{flex:1, marginRight: "10px"}}>
             <label style={labelStyle}>Panel Wattage (Wp)</label>
             <input style={inputStyle} name="panelWattage" placeholder="e.g. 550" value={formData.panelWattage} onChange={handleChange} />
          </div>
          <div style={{flex:1}}>
             <label style={labelStyle}>Panel Qty (Nos)</label>
             <input style={inputStyle} name="panelQty" placeholder="e.g. 12" value={formData.panelQty} onChange={handleChange} />
          </div>
        </div>

        {/* ROW 3: Inverter Make & Capacity (UPDATED: Datalist for manual entry) */}
        <div style={rowStyle}>
           <div style={{flex:1, marginRight: "10px"}}>
             <label style={labelStyle}>Inverter Make</label>
             <input 
                style={inputStyle} 
                name="inverterMake" 
                list="inverter-makes"
                value={formData.inverterMake}
                onChange={handleChange} 
                placeholder="Select or type..."
             />
             <datalist id="inverter-makes">
                <option value="Deye" /><option value="Solis" /><option value="Sungrow" /><option value="UTL" />
             </datalist>
           </div>
           <div style={{flex:1}}>
             <label style={labelStyle}>Inverter Capacity (kW)</label>
             <input style={inputStyle} name="inverterCapacity" placeholder="e.g. 10" value={formData.inverterCapacity} onChange={handleChange} />
           </div>
        </div>

        {/* ROW 4: Mounting Type & Warranty (NEW) */}
        <div style={rowStyle}>
           <div style={{flex:1, marginRight: "10px"}}>
             <label style={labelStyle}>Mounting Type</label>
             <select style={inputStyle} name="mountingType" value={formData.mountingType} onChange={handleChange}>
                <option value="Structure">Structure</option>
                <option value="Direct Mounting">Direct Mounting</option>
             </select>
           </div>
           <div style={{flex:1}}>
             <label style={labelStyle}>Warranty (Years)</label>
             <input style={inputStyle} name="inverterWarranty" placeholder="e.g. 8" value={formData.inverterWarranty} onChange={handleChange} />
           </div>
        </div>

        {/* ROW 5: CONDITIONAL STRUCTURE OR DIRECT MOUNTING DETAILS */}
        {formData.mountingType === 'Structure' ? (
            <div style={rowStyle}>
                <div style={{flex:1, marginRight: "10px"}}>
                    <label style={labelStyle}>Structure Make</label>
                    <input style={inputStyle} name="structureMake" placeholder="e.g. Hindustar" value={formData.structureMake} onChange={handleChange} />
                </div>
                <div style={{flex:1}}>
                    <label style={labelStyle}>Structure Qty (kg)</label>
                    <input style={inputStyle} name="structureQty" placeholder="e.g. 370" value={formData.structureQty} onChange={handleChange} />
                </div>
            </div>
        ) : (
            <div style={rowStyle}>
                <div style={{flex:1}}>
                    <label style={labelStyle}>Direct Mounting Details</label>
                    <input style={inputStyle} name="mountingDetails" placeholder="e.g. Aluminum Rails with Fasteners" value={formData.mountingDetails} onChange={handleChange} />
                </div>
            </div>
        )}

        {/* ROW 6: Lightning Arrestor */}
        <div style={rowStyle}>
            <div style={{flex:1}}>
                <label style={labelStyle}>Lightning Arrestor</label>
                <select style={inputStyle} name="laType" value={formData.laType} onChange={handleChange}>
                    <option value="Conventional">Conventional</option>
                    <option value="ESE(107 MTR Radius)">ESE(107 MTR Radius)</option>
                </select>
            </div>
        </div>

        {/* --- SECTION 3: COMMERCIALS --- */}
        <h4 style={sectionHeader}>3. Commercials</h4>
        
        <div style={rowStyle}>
           <div style={{flex:1, marginRight: "10px"}}>
              <label style={labelStyle}>System Rate / kW</label>
              <input style={inputStyle} name="systemRate" placeholder="e.g. 22750" value={formData.systemRate} onChange={handleChange} />
           </div>
           <div style={{flex:1}}>
              <label style={labelStyle}>Structure Rate / kW</label>
              <input style={inputStyle} name="structureRate" placeholder="e.g. 4000" value={formData.structureRate} onChange={handleChange} />
           </div>
        </div>

        <div style={{background: "#e8f5e9", padding: "15px", borderRadius: "8px", marginTop: "15px"}}>
            <div style={calcRow}><span>System Cost:</span> <strong>₹ {formData.systemCost}</strong></div>
            <div style={calcRow}><span>GST @ 8.9%:</span> <strong>₹ {formData.gstAmount}</strong></div>
            <div style={calcRow}><span>Structure Cost:</span> <strong>₹ {formData.structureCost}</strong></div>
            <hr/>
            <div style={{...calcRow, fontSize: "18px", color: "#2E7D32"}}><span>Final Total:</span> <strong>₹ {formData.totalAmount}</strong></div>
        </div>
        
        <button onClick={handleDownload} style={buttonStyle} disabled={loading}>
          {loading ? "Generating..." : "Download Quotation"}
        </button>

      </div>
    </div>
  );
}

const labelStyle = { display: "block", marginTop: "10px", fontWeight: "bold", fontSize: "13px", color: "#555" };
const inputStyle = { width: "100%", padding: "8px", marginTop: "5px", border: "1px solid #ccc", borderRadius: "5px", boxSizing: "border-box" };
const buttonStyle = { width: "100%", padding: "15px", backgroundColor: "#2E7D32", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "16px", marginTop: "25px", fontWeight: "bold" };
const sectionHeader = { borderBottom: "2px solid #eee", paddingBottom: "5px", marginTop: "20px", color: "#333" };
const rowStyle = { display: "flex", justifyContent: "space-between" };
const calcRow = { display: "flex", justifyContent: "space-between", marginBottom: "5px" };

export default App;