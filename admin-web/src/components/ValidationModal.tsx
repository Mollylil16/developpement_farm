import { useState } from 'react'
import { Modal } from './ui/modal'
import { FileText, CheckCircle, XCircle, Download, Eye, AlertCircle } from 'lucide-react'
import Button from './ui/button/Button'
import Badge from './ui/badge/Badge'

interface Veterinarian {
  id: string
  prenom: string
  nom: string
  email: string
  telephone?: string
  status: 'pending' | 'approved' | 'rejected'
  cni_verified: boolean
  diploma_verified: boolean
  cni_document?: string
  diploma_document?: string
  submitted_at?: string
}

interface ValidationModalProps {
  isOpen: boolean
  onClose: () => void
  veterinarian: Veterinarian | null
  onApprove: (id: string, reason?: string) => void
  onReject: (id: string, reason: string) => void
}

export default function ValidationModal({
  isOpen,
  onClose,
  veterinarian,
  onApprove,
  onReject,
}: ValidationModalProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionForm, setShowRejectionForm] = useState(false)
  const [approvalReason, setApprovalReason] = useState('')

  if (!veterinarian) return null

  const handleApprove = () => {
    onApprove(veterinarian.id, approvalReason || undefined)
    setApprovalReason('')
    setShowRejectionForm(false)
  }

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Veuillez fournir une raison de rejet')
      return
    }
    onReject(veterinarian.id, rejectionReason)
    setRejectionReason('')
    setShowRejectionForm(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-gray-900">
      <div className="p-6 dark:text-white">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Validation du Vétérinaire
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Consultez les documents et validez ou rejetez le profil
          </p>
        </div>

        {/* Informations du vétérinaire */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Informations personnelles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nom complet</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {veterinarian.prenom} {veterinarian.nom}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">
                {veterinarian.email}
              </p>
            </div>
            {veterinarian.telephone && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Téléphone</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {veterinarian.telephone}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Statut</p>
              <Badge
                variant={veterinarian.status === 'approved' ? 'solid' : 'light'}
                color={
                  veterinarian.status === 'approved'
                    ? 'success'
                    : veterinarian.status === 'rejected'
                    ? 'error'
                    : 'warning'
                }
              >
                {veterinarian.status === 'approved'
                  ? 'Approuvé'
                  : veterinarian.status === 'rejected'
                  ? 'Rejeté'
                  : 'En attente'}
              </Badge>
            </div>
            {veterinarian.submitted_at && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Date de soumission</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {new Date(veterinarian.submitted_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents</h3>

          {/* CNI */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    Carte Nationale d'Identité (CNI)
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Document d'identité officiel
                  </p>
                </div>
              </div>
              <Badge
                variant={veterinarian.cni_verified ? 'solid' : 'light'}
                color={veterinarian.cni_verified ? 'success' : 'warning'}
              >
                {veterinarian.cni_verified ? 'Vérifiée' : 'Non vérifiée'}
              </Badge>
            </div>
            {veterinarian.cni_document ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  startIcon={<Eye className="h-4 w-4" />}
                  onClick={() => window.open(veterinarian.cni_document, '_blank')}
                >
                  Voir le document
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  startIcon={<Download className="h-4 w-4" />}
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = veterinarian.cni_document!
                    link.download = `CNI_${veterinarian.nom}_${veterinarian.prenom}.pdf`
                    link.click()
                  }}
                >
                  Télécharger
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <AlertCircle className="h-4 w-4" />
                <span>Aucun document CNI fourni</span>
              </div>
            )}
          </div>

          {/* Diplôme */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    Diplôme professionnel
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Diplôme de vétérinaire ou équivalent
                  </p>
                </div>
              </div>
              <Badge
                variant={veterinarian.diploma_verified ? 'solid' : 'light'}
                color={veterinarian.diploma_verified ? 'success' : 'warning'}
              >
                {veterinarian.diploma_verified ? 'Vérifié' : 'Non vérifié'}
              </Badge>
            </div>
            {veterinarian.diploma_document ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  startIcon={<Eye className="h-4 w-4" />}
                  onClick={() => window.open(veterinarian.diploma_document, '_blank')}
                >
                  Voir le document
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  startIcon={<Download className="h-4 w-4" />}
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = veterinarian.diploma_document!
                    link.download = `Diplome_${veterinarian.nom}_${veterinarian.prenom}.pdf`
                    link.click()
                  }}
                >
                  Télécharger
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <AlertCircle className="h-4 w-4" />
                <span>Aucun diplôme fourni</span>
              </div>
            )}
          </div>
        </div>

        {/* Raison d'approbation (optionnelle) */}
        {!showRejectionForm && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Raison d'approbation (optionnel)
            </label>
            <textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              placeholder="Ajoutez une note interne sur cette validation..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              rows={3}
            />
          </div>
        )}

        {/* Formulaire de rejet */}
        {showRejectionForm && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
              Raison du rejet <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Expliquez pourquoi ce profil est rejeté..."
              className="w-full px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              rows={4}
              required
            />
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Cette raison sera visible par le vétérinaire
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          {!showRejectionForm ? (
            <>
              <Button
                variant="primary"
                startIcon={<CheckCircle className="h-4 w-4" />}
                onClick={handleApprove}
                disabled={veterinarian.status === 'approved'}
              >
                Approuver
              </Button>
              <Button
                variant="primary"
                startIcon={<XCircle className="h-4 w-4" />}
                onClick={() => setShowRejectionForm(true)}
                disabled={veterinarian.status === 'rejected'}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Rejeter
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowRejectionForm(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                startIcon={<XCircle className="h-4 w-4" />}
                onClick={handleReject}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Confirmer le rejet
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
