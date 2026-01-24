import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, AlertCircle, Search, Filter, FileText } from 'lucide-react'
import { adminApi } from '../services/api'
import Badge from '../components/ui/badge/Badge'
import ValidationModal from '../components/ValidationModal'
import Button from '../components/ui/button/Button'
import toast from 'react-hot-toast'

export default function Validation() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedVet, setSelectedVet] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['veterinarians-validation', statusFilter, searchTerm],
    queryFn: () =>
      adminApi.getVeterinariansForValidation({
        status: statusFilter,
        search: searchTerm || undefined,
      }),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.approveVeterinarian(id, reason),
    onSuccess: async () => {
      // Invalider et refetch immédiatement pour mettre à jour le statut
      await queryClient.invalidateQueries({ queryKey: ['veterinarians-validation'] })
      await queryClient.refetchQueries({ queryKey: ['veterinarians-validation'] })
      toast.success('Vétérinaire approuvé avec succès')
      setIsModalOpen(false)
      setSelectedVet(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'approbation')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectVeterinarian(id, reason),
    onSuccess: async () => {
      // Invalider et refetch immédiatement pour mettre à jour le statut
      await queryClient.invalidateQueries({ queryKey: ['veterinarians-validation'] })
      await queryClient.refetchQueries({ queryKey: ['veterinarians-validation'] })
      toast.success('Vétérinaire rejeté avec succès')
      setIsModalOpen(false)
      setSelectedVet(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors du rejet')
    },
  })

  const handleApprove = (id: string, reason?: string) => {
    approveMutation.mutate({ id, reason })
  }

  const handleReject = (id: string, reason: string) => {
    rejectMutation.mutate({ id, reason })
  }

  const handleOpenModal = async (vet: any) => {
    // Charger les documents du vétérinaire
    try {
      const documentsData = await adminApi.getVeterinarianDocuments(vet.id)
      setSelectedVet({
        ...vet,
        status: vet.validation_status || vet.status || 'pending',
        cni_document: documentsData.cni_document_url,
        diploma_document: documentsData.diploma_document_url,
        submitted_at: vet.documents_submitted_at,
      })
    } catch (error) {
      // En cas d'erreur, utiliser les données disponibles
      setSelectedVet({
        ...vet,
        status: vet.validation_status || vet.status || 'pending',
        cni_document: vet.cni_document_url,
        diploma_document: vet.diploma_document_url,
        submitted_at: vet.documents_submitted_at,
      })
    }
    setIsModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm font-medium text-red-600 mb-1">Erreur de chargement</p>
        <p className="text-xs text-gray-500">Veuillez réessayer</p>
      </div>
    )
  }

  const veterinarians = data?.veterinarians || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Validation des Vétérinaires
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Validez les profils et documents des vétérinaires
          </p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Filtre statut */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvés</option>
              <option value="rejected">Rejetés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des vétérinaires */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {veterinarians.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Aucun vétérinaire à valider
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tous les profils ont été validés
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {veterinarians.map((vet: any) => (
              <div
                key={vet.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {vet.prenom} {vet.nom}
                      </h3>
                      <Badge
                        variant={(vet.validation_status || vet.status) === 'approved' ? 'solid' : 'light'}
                        color={(vet.validation_status || vet.status) === 'approved' ? 'success' : (vet.validation_status || vet.status) === 'rejected' ? 'error' : 'warning'}
                      >
                        {(vet.validation_status || vet.status) === 'approved' ? 'Approuvé' : (vet.validation_status || vet.status) === 'rejected' ? 'Rejeté' : 'En attente'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{vet.email}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        CNI: {vet.cni_verified ? 'Vérifiée' : 'Non vérifiée'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Diplôme: {vet.diploma_verified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleOpenModal(vet)}
                    >
                      Détails & Valider
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de validation */}
      <ValidationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedVet(null)
        }}
        veterinarian={selectedVet}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}
