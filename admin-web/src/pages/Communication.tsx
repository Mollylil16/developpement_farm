import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../services/api'
import {
  Mail,
  Gift,
  Tag,
  Users,
  Send,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Calendar,
  Percent,
  Award,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function Communication() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'messages' | 'promotions' | 'congratulate'>('messages')
  
  // État pour le formulaire de message
  const [messageForm, setMessageForm] = useState({
    subject: '',
    content: '',
    type: 'announcement' as 'support' | 'announcement' | 'gift' | 'promotion' | 'warning' | 'congratulations',
    target_audience: 'all' as 'all' | 'active_users' | 'new_users' | 'specific_users' | 'by_role',
    target_user_ids: [] as string[],
    target_roles: [] as string[],
  })

  // État pour le formulaire de promotion
  const [promotionForm, setPromotionForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'discount' as 'discount' | 'free_month' | 'gift' | 'bonus',
    discount_percentage: 0,
    discount_amount: 0,
    free_months: 0,
    gift_description: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    max_uses: 0,
    target_audience: 'all' as 'all' | 'new_users' | 'active_users' | 'specific_users',
    is_active: true,
  })

  // État pour féliciter les utilisateurs actifs
  const [congratulateForm, setCongratulateForm] = useState({
    message: '',
    gift_description: '',
  })

  // Récupérer les messages
  const { data: messagesData, error: messagesError, isLoading: messagesLoading } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => adminApi.getMessages(1, 20),
    retry: false,
    onError: (error) => {
      console.error('Erreur lors du chargement des messages:', error)
    },
  })

  // Récupérer les promotions
  const { data: promotionsData, error: promotionsError, isLoading: promotionsLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: () => adminApi.getPromotions(1, 20),
    retry: false,
    onError: (error) => {
      console.error('Erreur lors du chargement des promotions:', error)
    },
  })

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: (data: any) => adminApi.sendMessage(data),
    onSuccess: (data) => {
      toast.success(`Message envoyé à ${data.sent_count} utilisateur(s)`)
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] })
      setMessageForm({
        subject: '',
        content: '',
        type: 'announcement',
        target_audience: 'all',
        target_user_ids: [],
        target_roles: [],
      })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi du message')
    },
  })

  // Mutation pour créer une promotion
  const createPromotionMutation = useMutation({
    mutationFn: (data: any) => adminApi.createPromotion(data),
    onSuccess: () => {
      toast.success('Promotion créée avec succès')
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] })
      setPromotionForm({
        code: '',
        name: '',
        description: '',
        type: 'discount',
        discount_percentage: 0,
        discount_amount: 0,
        free_months: 0,
        gift_description: '',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        max_uses: 0,
        target_audience: 'all',
        is_active: true,
      })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erreur lors de la création de la promotion')
    },
  })

  // Mutation pour féliciter les utilisateurs actifs
  const congratulateMutation = useMutation({
    mutationFn: (data: { message: string; gift_description?: string }) => 
      adminApi.congratulateActiveUsers(data),
    onSuccess: (data) => {
      toast.success(`Félicitations envoyées à ${data.sent_count} utilisateur(s) actif(s)${data.promotion_code ? ` avec code promo: ${data.promotion_code}` : ''}`)
      queryClient.invalidateQueries({ queryKey: ['admin-messages', 'admin-promotions'] })
      setCongratulateForm({ message: '', gift_description: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi des félicitations')
    },
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessageMutation.mutate(messageForm)
  }

  const handleCreatePromotion = (e: React.FormEvent) => {
    e.preventDefault()
    createPromotionMutation.mutate(promotionForm)
  }

  const handleCongratulate = (e: React.FormEvent) => {
    e.preventDefault()
    congratulateMutation.mutate(congratulateForm)
  }

  // Afficher un loader pendant le chargement initial
  if (messagesLoading || promotionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Communication & Promotions</h1>
        <p className="text-sm text-gray-500">Envoyez des messages, créez des promotions et félicitez vos utilisateurs</p>
        {(messagesError || promotionsError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              Erreur de chargement: {(messagesError as any)?.response?.data?.message || (promotionsError as any)?.response?.data?.message || (messagesError as any)?.message || (promotionsError as any)?.message || 'Erreur inconnue'}
            </p>
            <p className="text-xs text-red-500 mt-1">
              Vérifiez que le backend est lancé et que les endpoints /admin/messages et /admin/promotions sont disponibles.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="inline h-4 w-4 mr-2" />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'promotions'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Tag className="inline h-4 w-4 mr-2" />
              Promotions
            </button>
            <button
              onClick={() => setActiveTab('congratulate')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'congratulate'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Award className="inline h-4 w-4 mr-2" />
              Féliciter
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Messages */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulaire d'envoi */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Envoyer un message</h2>
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                      <input
                        type="text"
                        value={messageForm.subject}
                        onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={messageForm.type}
                        onChange={(e) => setMessageForm({ ...messageForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="announcement">Annonce</option>
                        <option value="support">Support</option>
                        <option value="gift">Cadeau</option>
                        <option value="promotion">Promotion</option>
                        <option value="warning">Avertissement</option>
                        <option value="congratulations">Félicitations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                      <select
                        value={messageForm.target_audience}
                        onChange={(e) => setMessageForm({ ...messageForm, target_audience: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="all">Tous les utilisateurs</option>
                        <option value="active_users">Utilisateurs actifs</option>
                        <option value="new_users">Nouveaux utilisateurs</option>
                        <option value="specific_users">Utilisateurs spécifiques</option>
                        <option value="by_role">Par rôle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contenu (HTML supporté)</label>
                      <textarea
                        value={messageForm.content}
                        onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Bonjour {{name}}, ..."
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Utilisez {'{{'}name{'}}'} et {'{{'}email{'}}'} pour personnaliser</p>
                    </div>

                    <button
                      type="submit"
                      disabled={sendMessageMutation.isPending}
                      className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
                    >
                      <Send className="inline h-4 w-4 mr-2" />
                      {sendMessageMutation.isPending ? 'Envoi...' : 'Envoyer le message'}
                    </button>
                  </form>
                </div>

                {/* Historique des messages */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {messagesData?.data?.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">Aucun message envoyé</p>
                    ) : (
                      messagesData?.data?.map((msg: any) => (
                        <div key={msg.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-900">{msg.subject}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              msg.status === 'sent' ? 'bg-green-50 text-green-700' :
                              msg.status === 'failed' ? 'bg-red-50 text-red-700' :
                              'bg-yellow-50 text-yellow-700'
                            }`}>
                              {msg.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{msg.type}</p>
                          <p className="text-xs text-gray-600">
                            {msg.sent_count} envoyé(s), {msg.failed_count} échoué(s)
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Promotions */}
          {activeTab === 'promotions' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulaire de création */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Créer une promotion</h2>
                  <form onSubmit={handleCreatePromotion} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code promo *</label>
                      <input
                        type="text"
                        value={promotionForm.code}
                        onChange={(e) => setPromotionForm({ ...promotionForm, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="PROMO2024"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                      <input
                        type="text"
                        value={promotionForm.name}
                        onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select
                        value={promotionForm.type}
                        onChange={(e) => setPromotionForm({ ...promotionForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="discount">Réduction</option>
                        <option value="free_month">Mois gratuit</option>
                        <option value="gift">Cadeau</option>
                        <option value="bonus">Bonus</option>
                      </select>
                    </div>

                    {promotionForm.type === 'discount' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pourcentage (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={promotionForm.discount_percentage}
                            onChange={(e) => setPromotionForm({ ...promotionForm, discount_percentage: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ou montant fixe (CFA)</label>
                          <input
                            type="number"
                            min="0"
                            value={promotionForm.discount_amount}
                            onChange={(e) => setPromotionForm({ ...promotionForm, discount_amount: parseInt(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}

                    {promotionForm.type === 'free_month' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de mois gratuits</label>
                        <input
                          type="number"
                          min="1"
                          value={promotionForm.free_months}
                          onChange={(e) => setPromotionForm({ ...promotionForm, free_months: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                        />
                      </div>
                    )}

                    {promotionForm.type === 'gift' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description du cadeau</label>
                        <textarea
                          value={promotionForm.gift_description}
                          onChange={(e) => setPromotionForm({ ...promotionForm, gift_description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
                      <input
                        type="date"
                        value={promotionForm.valid_from}
                        onChange={(e) => setPromotionForm({ ...promotionForm, valid_from: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                      <input
                        type="date"
                        value={promotionForm.valid_until}
                        onChange={(e) => setPromotionForm({ ...promotionForm, valid_until: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Utilisations max (0 = illimité)</label>
                      <input
                        type="number"
                        min="0"
                        value={promotionForm.max_uses}
                        onChange={(e) => setPromotionForm({ ...promotionForm, max_uses: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={createPromotionMutation.isPending}
                      className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
                    >
                      <Plus className="inline h-4 w-4 mr-2" />
                      {createPromotionMutation.isPending ? 'Création...' : 'Créer la promotion'}
                    </button>
                  </form>
                </div>

                {/* Liste des promotions */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Promotions actives</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {promotionsData?.data?.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">Aucune promotion</p>
                    ) : (
                      promotionsData?.data?.map((promo: any) => (
                        <div key={promo.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">{promo.name}</h3>
                              <p className="text-xs text-teal-600 font-mono mt-1">{promo.code}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              promo.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                            }`}>
                              {promo.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{promo.type}</p>
                          {promo.discount_percentage && (
                            <p className="text-xs text-gray-600">-{promo.discount_percentage}%</p>
                          )}
                          {promo.free_months && (
                            <p className="text-xs text-gray-600">{promo.free_months} mois gratuit(s)</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {promo.current_uses} / {promo.max_uses || '∞'} utilisations
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Féliciter */}
          {activeTab === 'congratulate' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">🎉 Féliciter les utilisateurs actifs</h2>
                <p className="text-sm text-gray-600">
                  Envoyez un message de félicitations aux utilisateurs actifs (connexion dans les 30 derniers jours) 
                  et offrez-leur un cadeau spécial !
                </p>
              </div>

              <form onSubmit={handleCongratulate} className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message de félicitations *</label>
                  <textarea
                    value={congratulateForm.message}
                    onChange={(e) => setCongratulateForm({ ...congratulateForm, message: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Félicitations ! Vous êtes un utilisateur actif et nous vous remercions..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cadeau (optionnel)</label>
                  <input
                    type="text"
                    value={congratulateForm.gift_description}
                    onChange={(e) => setCongratulateForm({ ...congratulateForm, gift_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Ex: 1 mois gratuit, 20% de réduction..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Si rempli, un code promo sera automatiquement créé et envoyé
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={congratulateMutation.isPending}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  <Award className="inline h-4 w-4 mr-2" />
                  {congratulateMutation.isPending ? 'Envoi...' : 'Envoyer les félicitations'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

