import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  File,
  Calendar,
  Layers,
  ArrowLeft,
  Users,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  MessageSquare,
  Crown,
  Ban,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import DisclaimerBanner from '../components/DisclaimerBanner';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const AdminPage = ({ user }) => {
  const { isDark } = useTheme();
  // --- Documents state ---
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  // --- Users state ---
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersNotif, setUsersNotif] = useState('');
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'users'
  const [loadingAction, setLoadingAction] = useState(null); // userId en cours d'action

  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, []);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const response = await adminAPI.getDocuments();
      setDocuments(response.data);
    } catch (err) {
      setError('Impossible de charger les documents.');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (err) {
      setUsersError('Impossible de charger les utilisateurs.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setIsUploading(true);
    setUploadResult(null);
    setError('');

    try {
      const response = await adminAPI.uploadDocument(file, title.trim());
      setUploadResult(response.data);
      setFile(null);
      setTitle('');
      const fileInput = document.getElementById('admin-file-input');
      if (fileInput) fileInput.value = '';
      fetchDocuments();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Erreur lors de l'upload. Veuillez réessayer."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId, docTitle) => {
    if (!confirm(`Supprimer "${docTitle}" et tous ses chunks vectoriels ?`)) return;

    try {
      await adminAPI.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError('Erreur lors de la suppression.');
    }
  };

  const showUsersNotif = (msg) => {
    setUsersNotif(msg);
    setTimeout(() => setUsersNotif(''), 3500);
  };

  const handleToggleAdmin = async (userId) => {
    setLoadingAction(`admin-${userId}`);
    setUsersError('');
    try {
      const res = await adminAPI.toggleUserAdmin(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: res.data.is_admin } : u))
      );
      showUsersNotif(res.data.message);
    } catch (err) {
      setUsersError(err.response?.data?.detail || 'Erreur lors de la modification du rôle.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleActive = async (userId) => {
    setLoadingAction(`active-${userId}`);
    setUsersError('');
    try {
      const res = await adminAPI.toggleUserActive(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: res.data.is_active } : u))
      );
      showUsersNotif(res.data.message);
    } catch (err) {
      setUsersError(err.response?.data?.detail || "Erreur lors du changement de statut.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Supprimer définitivement le compte de "${userName}" et toutes ses données ?`)) return;
    setLoadingAction(`delete-${userId}`);
    setUsersError('');
    try {
      const res = await adminAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showUsersNotif(res.data.message);
    } catch (err) {
      setUsersError(err.response?.data?.detail || 'Erreur lors de la suppression.');
    } finally {
      setLoadingAction(null);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);
  const activeUsers = users.filter((u) => u.is_active).length;
  const adminUsers = users.filter((u) => u.is_admin).length;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-surface-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`glass border-b sticky top-0 z-10 transition-colors duration-300 ${
        isDark ? 'border-surface-700/30' : 'border-slate-200/80 bg-white/90'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/chat')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                isDark ? 'bg-surface-800/60 hover:bg-surface-700/60 text-surface-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Retour au chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-lg sm:text-xl font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Administration
              </h1>
              <p className={`text-xxs sm:text-xs ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                Gestion de la base documentaire et des utilisateurs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0 flex-wrap">
            <div className={`rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 border ${
              isDark ? 'glass-light border-surface-700/30' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <Database className="w-4 h-4 text-mali-green flex-shrink-0" />
              <span className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-surface-200' : 'text-slate-800'}`}>
                {documents.length} <span className="hidden sm:inline">documents</span><span className="sm:hidden">docs</span>
              </span>
              <span className="text-surface-400">•</span>
              <span className={`text-xs sm:text-sm ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                {totalChunks} <span className="hidden sm:inline">chunks</span><span className="sm:hidden">ch.</span>
              </span>
            </div>
            <div className={`rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 border ${
              isDark ? 'glass-light border-surface-700/30' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <Users className="w-4 h-4 text-mali-gold flex-shrink-0" />
              <span className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-surface-200' : 'text-slate-800'}`}>
                {users.length} <span className="hidden sm:inline">utilisateurs</span><span className="sm:hidden">users</span>
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Tabs */}
        <div className={`flex gap-2 rounded-2xl p-1.5 border transition-colors ${
          isDark ? 'bg-surface-900/50 border-surface-700/20' : 'bg-slate-200/80 border-slate-300/80'
        }`}>
          <button
            onClick={() => setActiveTab('documents')}
            id="tab-documents"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'documents'
                ? isDark
                  ? 'bg-mali-green/20 text-mali-green border border-mali-green/30'
                  : 'bg-white text-emerald-700 shadow-sm border border-emerald-300 font-bold'
                : isDark
                ? 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>Documents</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            id="tab-users"
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === 'users'
                ? isDark
                  ? 'bg-mali-gold/20 text-mali-gold border border-mali-gold/30'
                  : 'bg-white text-amber-700 shadow-sm border border-amber-300 font-bold'
                : isDark
                ? 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>Utilisateurs</span>
            {users.length > 0 && (
              <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${
                activeTab === 'users' ? 'bg-mali-gold/20 text-mali-gold' : 'bg-surface-700 text-surface-400'
              }`}>
                {users.length}
              </span>
            )}
          </button>
        </div>

        {/* ===== ONGLET DOCUMENTS ===== */}
        {activeTab === 'documents' && (
          <>
            {/* Upload Section */}
            <section className="card animate-fade-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-mali-green/15 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-mali-green" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Upload d'un texte de loi
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                    Ajoutez un fichier PDF pour l'indexer dans la base vectorielle
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
                      Titre du document
                    </label>
                    <input
                      id="admin-doc-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Code de la Famille du Mali"
                      required
                      className={`input-field ${isDark ? '' : 'bg-white text-slate-900 border-slate-300'}`}
                    />
                  </div>

                  {/* File */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-surface-300' : 'text-slate-700'}`}>
                      Fichier PDF
                    </label>
                    <div className="relative">
                      <input
                        id="admin-file-input"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setFile(e.target.files[0])}
                        required
                        className={`input-field ${isDark ? '' : 'bg-white text-slate-900 border-slate-300'} file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 
                                   file:text-sm file:font-semibold file:bg-mali-green/15 file:text-mali-green
                                   hover:file:bg-mali-green/25 file:cursor-pointer file:transition-colors`}
                      />
                    </div>
                  </div>
                </div>

                {/* File info */}
                {file && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg animate-fade-in border ${
                    isDark ? 'bg-surface-800/30 border-surface-700/30 text-surface-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>
                    <File className="w-4 h-4 text-mali-gold" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className={`text-xs ${isDark ? 'text-surface-500' : 'text-slate-500'}`}>
                      ({(file.size / 1024 / 1024).toFixed(2)} Mo)
                    </span>
                  </div>
                )}

                <button
                  id="admin-upload-btn"
                  type="submit"
                  disabled={isUploading || !file || !title.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      <span>
                        Traitement... <span className="hidden sm:inline">(extraction, découpage, vectorisation)</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 flex-shrink-0" />
                      Uploader et indexer
                    </>
                  )}
                </button>
              </form>

              {/* Upload Result */}
              {uploadResult && (
                <div className="mt-4 p-4 rounded-xl bg-mali-green/10 border border-mali-green/20 animate-slide-up">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-mali-green mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-mali-green">
                        {uploadResult.message}
                      </p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>
                        {uploadResult.chunks_created} chunks vectoriels créés
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-mali-red/10 border border-mali-red/20 animate-slide-up">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-mali-red" />
                    <p className="text-sm text-mali-red font-medium">{error}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Documents List */}
            <section className="card animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-mali-gold/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-mali-gold" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Documents indexés
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                    Textes de loi disponibles dans la base vectorielle
                  </p>
                </div>
              </div>

              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-mali-green animate-spin" />
                  <span className={`ml-3 ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>Chargement...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <Database className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-surface-600' : 'text-slate-400'}`} />
                  <p className={`font-medium ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>Aucun document indexé.</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-surface-500' : 'text-slate-500'}`}>
                    Uploadez un PDF pour commencer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all duration-300 group ${
                        isDark
                          ? 'bg-surface-800/30 border-surface-700/20 hover:border-surface-600/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Doc Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mali-green/10 to-mali-gold/5 flex items-center justify-center border border-mali-green/20 flex-shrink-0">
                          <FileText className="w-5 h-5 text-mali-green" />
                        </div>

                        {/* Doc Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {doc.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <span className={`flex items-center gap-1 text-xs min-w-0 max-w-[180px] sm:max-w-[280px] ${
                              isDark ? 'text-surface-400' : 'text-slate-600'
                            }`}>
                              <File className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{doc.filename}</span>
                            </span>
                            <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${
                              isDark ? 'text-surface-400' : 'text-slate-600'
                            }`}>
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-mali-green font-medium flex-shrink-0">
                              <Layers className="w-3 h-3 flex-shrink-0" />
                              {doc.chunk_count} chunks
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 self-end sm:self-auto flex-shrink-0 ${
                          isDark ? 'bg-surface-700/30 hover:bg-mali-red/15 text-surface-400 hover:text-mali-red' : 'bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600'
                        }`}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 transition-colors" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ===== ONGLET UTILISATEURS ===== */}
        {activeTab === 'users' && (
          <section className="card animate-fade-in">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-mali-gold/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-mali-gold" />
              </div>
              <div className="flex-1">
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Gestion des utilisateurs
                </h2>
                <p className={`text-sm ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>
                  Gérez les rôles, l'accès et les comptes utilisateurs
                </p>
              </div>
              <button
                onClick={fetchUsers}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  isDark
                    ? 'text-surface-400 hover:text-surface-200 bg-surface-800/50 border-surface-700/30 hover:bg-surface-700/50'
                    : 'text-slate-700 hover:text-slate-900 bg-slate-100 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Actualiser
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className={`p-3 rounded-xl border text-center ${
                isDark ? 'bg-surface-800/40 border-surface-700/20' : 'bg-slate-100 border-slate-200'
              }`}>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{users.length}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>Total</p>
              </div>
              <div className="p-3 rounded-xl bg-mali-green/10 border border-mali-green/20 text-center">
                <p className="text-2xl font-bold text-mali-green">{activeUsers}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>Actifs</p>
              </div>
              <div className="p-3 rounded-xl bg-mali-gold/10 border border-mali-gold/20 text-center">
                <p className="text-2xl font-bold text-mali-gold">{adminUsers}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-400' : 'text-slate-500'}`}>Admins</p>
              </div>
            </div>

            {/* Notification */}
            {usersNotif && (
              <div className="mb-4 p-3 rounded-xl bg-mali-green/10 border border-mali-green/20 animate-slide-up flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-mali-green flex-shrink-0" />
                <p className="text-sm text-mali-green font-medium">{usersNotif}</p>
              </div>
            )}

            {/* Error */}
            {usersError && (
              <div className="mb-4 p-3 rounded-xl bg-mali-red/10 border border-mali-red/20 animate-slide-up flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-mali-red flex-shrink-0" />
                <p className="text-sm text-mali-red font-medium">{usersError}</p>
              </div>
            )}

            {/* Users list */}
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-mali-gold animate-spin" />
                <span className={`ml-3 ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>Chargement des utilisateurs...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-surface-600' : 'text-slate-400'}`} />
                <p className={`font-medium ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>Aucun utilisateur trouvé.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const isCurrentUser = user && u.id === user.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        !u.is_active
                          ? isDark ? 'bg-mali-red/5 border-mali-red/20' : 'bg-rose-50/80 border-rose-200'
                          : u.is_admin
                          ? isDark ? 'bg-mali-gold/5 border-mali-gold/20' : 'bg-amber-50/80 border-amber-200'
                          : isDark ? 'bg-surface-800/30 border-surface-700/20 hover:border-surface-600/30' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Avatar + Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold
                            ${!u.is_active
                              ? isDark ? 'bg-surface-700/50 text-surface-500' : 'bg-slate-200 text-slate-500'
                              : u.is_admin
                              ? 'bg-mali-gold/20 text-mali-gold'
                              : 'bg-mali-green/15 text-mali-green'
                            }`}>
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-semibold truncate ${
                                !u.is_active
                                  ? isDark ? 'text-surface-500 line-through' : 'text-slate-400 line-through'
                                  : isDark ? 'text-white' : 'text-slate-900'
                              }`}>
                                {u.full_name}
                              </p>
                              {u.is_admin && (
                                <span className="flex items-center gap-1 text-xxs bg-mali-gold/15 text-mali-gold px-2 py-0.5 rounded-full border border-mali-gold/20 flex-shrink-0 font-medium">
                                  <Crown className="w-2.5 h-2.5" />
                                  Admin
                                </span>
                              )}
                              {!u.is_active && (
                                <span className="flex items-center gap-1 text-xxs bg-mali-red/15 text-mali-red px-2 py-0.5 rounded-full border border-mali-red/20 flex-shrink-0 font-medium">
                                  <Ban className="w-2.5 h-2.5" />
                                  Suspendu
                                </span>
                              )}
                              {isCurrentUser && (
                                <span className={`text-xxs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
                                  isDark ? 'bg-surface-700/50 text-surface-400' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  Vous
                                </span>
                              )}
                            </div>
                            <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-surface-400' : 'text-slate-600'}`}>
                              {u.email}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${isDark ? 'text-surface-500' : 'text-slate-500'}`}>
                                <Calendar className="w-3 h-3" />
                                Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                              </span>
                              <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${isDark ? 'text-surface-500' : 'text-slate-500'}`}>
                                <MessageSquare className="w-3 h-3" />
                                {u.conversation_count} conv. · {u.message_count} msg
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                            {/* Toggle Admin */}
                            <button
                              id={`btn-toggle-admin-${u.id}`}
                              onClick={() => handleToggleAdmin(u.id)}
                              disabled={loadingAction !== null}
                              title={u.is_admin ? 'Rétrograder en utilisateur' : 'Promouvoir administrateur'}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50
                                ${u.is_admin
                                  ? 'bg-mali-gold/15 text-mali-gold hover:bg-mali-gold/25 border border-mali-gold/20'
                                  : isDark
                                  ? 'bg-surface-700/30 text-surface-400 hover:bg-mali-gold/15 hover:text-mali-gold border border-surface-600/20'
                                  : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-800 border border-slate-200'
                                }`}
                            >
                              {loadingAction === `admin-${u.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : u.is_admin ? (
                                <ShieldOff className="w-4 h-4" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                            </button>

                            {/* Toggle Active */}
                            <button
                              id={`btn-toggle-active-${u.id}`}
                              onClick={() => handleToggleActive(u.id)}
                              disabled={loadingAction !== null}
                              title={u.is_active ? 'Suspendre le compte' : 'Réactiver le compte'}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-50
                                ${!u.is_active
                                  ? 'bg-mali-green/15 text-mali-green hover:bg-mali-green/25 border border-mali-green/20'
                                  : 'bg-surface-700/30 text-surface-400 hover:bg-mali-red/15 hover:text-mali-red border border-surface-600/20'
                                }`}
                            >
                              {loadingAction === `active-${u.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : !u.is_active ? (
                                <UserCheck className="w-4 h-4" />
                              ) : (
                                <UserX className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete */}
                            <button
                              id={`btn-delete-user-${u.id}`}
                              onClick={() => handleDeleteUser(u.id, u.full_name)}
                              disabled={loadingAction !== null}
                              title="Supprimer définitivement"
                              className="w-9 h-9 rounded-xl bg-surface-700/30 text-surface-400 hover:bg-mali-red/15 hover:text-mali-red border border-surface-600/20 flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                            >
                              {loadingAction === `delete-${u.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Disclaimer */}
        <DisclaimerBanner />
      </div>
    </div>
  );
};

export default AdminPage;
