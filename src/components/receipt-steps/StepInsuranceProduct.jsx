import React, { useState, useEffect } from 'react'
import { api } from '../../api'

export default function StepInsuranceProduct({ onBack, onNext, token, issuer, initialProductId = '', recentProducts = [] }) {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (issuer?._key) {
      loadProducts()
    }
  }, [issuer])

  useEffect(() => {
    if (!initialProductId || !products.length) return
    const product = products.find(p => p.product_id === initialProductId)
    if (product) setSelectedProduct(product)
  }, [initialProductId, products])

  const loadProducts = async () => {
    const issuer_key = issuer?._key
    if (!token || !issuer_key) return
    setLoading(true)
    setSelectedProduct(null)
    try {
      const result = await api.getInsuranceProducts(token, issuer_key, 'true')
      const productsArray = Array.isArray(result) ? result : []
      setProducts(productsArray)
    } catch (error) {
      console.error('Failed to load insurance products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    if (!product.is_active) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        (product.product_name || '').toLowerCase().includes(query) ||
        (product.product_id || '').toLowerCase().includes(query) ||
        (product.category || '').toLowerCase().includes(query)
      )
    }
    return true
  })

  const handleProductSelect = async (product) => {
    // Fetch full product details if needed
    try {
      const issuer_key = issuer?._key
      const fullProduct = await api.getInsuranceProduct(token, issuer_key, product.product_id)
      setSelectedProduct(fullProduct)
    } catch (error) {
      console.error('Failed to load product details:', error)
      setSelectedProduct(product)
    }
  }

  const handleNext = () => {
    if (!selectedProduct) return
    onNext(selectedProduct)
  }

  return (
    <div>
      <h3 className="mt-0 text-lg font-semibold text-gray-900 dark:text-gray-100">Step 5 — Select Insurance Product</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        From: <strong className="text-gray-900 dark:text-white">{issuer?.short_name || issuer?.legal_name}</strong>
      </p>

      {recentProducts.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Products</label>
          <div className="flex flex-wrap gap-2">
            {recentProducts.map(product => (
              <button
                key={product.product_id}
                type="button"
                onClick={() => handleProductSelect(product)}
                className="px-3 py-1.5 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {product.product_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedProduct(null)
            }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No products found matching your search' : 'No products available'}
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = selectedProduct?.product_id === product.product_id
              return (
                <button
                  key={product.product_id}
                  type="button"
                  onClick={() => handleProductSelect(product)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">{product.product_name}</h4>
                      {product.description_short && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{product.description_short}</p>
                      )}
                    </div>
                    {product.category && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {product.category}
                      </span>
                    )}
                  </div>

                  {product.min_premium && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">Min Premium:</span> ₹{product.min_premium.toLocaleString()}
                      {product.max_premium && (
                        <> | <span className="font-medium">Max:</span> ₹{product.max_premium.toLocaleString()}</>
                      )}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}

      <div className="actions" style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBack} className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 bg-white/85 dark:bg-gray-800/85 font-bold text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedProduct}
          className="appearance-none border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 font-bold bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

