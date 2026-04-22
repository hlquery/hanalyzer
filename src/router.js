import { createRouter, createWebHashHistory } from 'vue-router'
import axios from 'axios'
import { buildApiUrl, shouldUseProxy } from './utils/apiHelpers'

const resolveRouterBase = () => {
  const configuredBase = import.meta.env.BASE_URL || '/'
  if (configuredBase === './' || configuredBase === '../') {
    if (typeof window === 'undefined') {
      return '/'
    }

    const url = new URL('.', window.location.href)
    return url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`
  }

  return configuredBase
}

const normalizeCollectionTab = (value) => {
  if (value === 'synonyms' || value === 'stopwords' || value === 'documents') {
    return value
  }
  return 'documents'
}

const redirectLegacyCollectionTabQuery = (to) => {
  const tab = normalizeCollectionTab(to.query?.tab)
  if (!to.query?.tab || tab === 'documents') {
    return true
  }

  const nextQuery = { ...to.query }
  delete nextQuery.tab

  return {
    path: `/collections/${encodeURIComponent(String(to.params.name || ''))}/${tab}`,
    query: nextQuery
  }
}

const routes = [
  {
    path: '/',
    name: 'home',
    redirect: '/collections'
  },
  {
    path: '/collections',
    name: 'collections',
    component: () => import('./views/CollectionsView.vue'),
    meta: {
      title: 'Collections',
      icon: 'mdi-folder-multiple'
    }
  },
  {
    path: '/collections/create',
    name: 'create-collection',
    component: () => import('./views/CreateCollectionView.vue'),
    meta: {
      title: 'Create Collection',
      icon: 'mdi-plus-circle'
    }
  },
  {
    path: '/collections/:name',
    name: 'collection-documents',
    component: () => import('./views/CollectionDocumentsView.vue'),
    props: true,
    beforeEnter: redirectLegacyCollectionTabQuery,
    meta: {
      title: 'Collection Documents',
      icon: 'mdi-file-document-multiple'
    }
  },
  {
    path: '/collections/:name/:page(\\d+)',
    name: 'collection-documents-page',
    component: () => import('./views/CollectionDocumentsView.vue'),
    props: true,
    beforeEnter: redirectLegacyCollectionTabQuery,
    meta: {
      title: 'Collection Documents',
      icon: 'mdi-file-document-multiple'
    }
  },
  {
    path: '/collections/:name/synonyms',
    name: 'collection-synonyms',
    component: () => import('./views/CollectionDocumentsView.vue'),
    props: true,
    meta: {
      title: 'Collection Synonyms',
      icon: 'mdi-swap-horizontal'
    }
  },
  {
    path: '/collections/:name/stopwords',
    name: 'collection-stopwords',
    component: () => import('./views/CollectionDocumentsView.vue'),
    props: true,
    meta: {
      title: 'Collection Stopwords',
      icon: 'mdi-cancel'
    }
  },
  {
    path: '/collections/:name/search-syntax',
    name: 'collection-search-syntax',
    component: () => import('./views/CollectionSearchSyntaxView.vue'),
    props: true,
    meta: {
      title: 'Collection Search Syntax',
      icon: 'mdi-text-box-search-outline'
    }
  },
  {
    path: '/collections/:name/schema',
    name: 'collection-schema',
    component: () => import('./views/CollectionSchemaView.vue'),
    props: true,
    meta: {
      title: 'Collection Schema',
      icon: 'mdi-code-braces'
    }
  },
  {
    path: '/collections/:name/details',
    name: 'collection-details',
    component: () => import('./views/CollectionDetailsView.vue'),
    props: true,
    meta: {
      title: 'Collection Details',
      icon: 'mdi-information-outline'
    }
  },
  {
    path: '/collections/:name/documents/add',
    name: 'add-document',
    component: () => import('./views/AddDocumentView.vue'),
    props: true,
    meta: {
      title: 'Add Document',
      icon: 'mdi-plus-circle'
    }
  },
  {
    path: '/collections/:name/synonyms/add',
    name: 'add-synonym',
    component: () => import('./views/AddSynonymView.vue'),
    props: true,
    meta: {
      title: 'Add Synonym',
      icon: 'mdi-swap-horizontal'
    }
  },
  {
    path: '/collections/:name/stopwords/add',
    name: 'add-stopword',
    component: () => import('./views/AddStopwordView.vue'),
    props: true,
    meta: {
      title: 'Add Stopword',
      icon: 'mdi-text-box-remove-outline'
    }
  },
  {
    path: '/collections/:name/documents/:docId',
    name: 'document-detail',
    component: () => import('./views/DocumentDetailView.vue'),
    props: true,
    meta: {
      title: 'Document Detail',
      icon: 'mdi-file-document'
    }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('./views/SearchView.vue'),
    meta: {
      title: 'Search',
      icon: 'mdi-magnify'
    }
  },
  {
    path: '/search/collections/:query?',
    name: 'collections-search',
    component: () => import('./views/CollectionsSearchView.vue'),
    props: true,
    meta: {
      title: 'Search Collections',
      icon: 'mdi-magnify'
    }
  },
  {
    path: '/search/results',
    name: 'search-results',
    component: () => import('./views/SearchResultsView.vue'),
    meta: {
      title: 'Search Results',
      icon: 'mdi-magnify'
    }
  },
  {
    path: '/sql',
    name: 'sql',
    component: () => import('./views/SqlView.vue'),
    meta: {
      title: 'SQL',
      icon: 'mdi-database'
    }
  },
  {
    path: '/aliases',
    name: 'aliases',
    component: () => import('./views/AliasesView.vue'),
    meta: {
      title: 'Aliases',
      icon: 'mdi-link-variant'
    }
  },
  {
    path: '/aliases/create',
    name: 'create-alias',
    component: () => import('./views/AddAliasView.vue'),
    meta: {
      title: 'Create Alias',
      icon: 'mdi-link-plus'
    }
  },
  {
    path: '/access',
    name: 'access',
    component: () => import('./views/AccessView.vue'),
    meta: {
      title: 'Access Management',
      icon: 'mdi-key-chain'
    }
  },
  {
    path: '/globals',
    name: 'globals',
    component: () => import('./views/GlobalsView.vue'),
    meta: {
      title: 'Globals',
      icon: 'mdi-earth'
    }
  },
  {
    path: '/globals/synonyms/add',
    name: 'add-global-synonym',
    component: () => import('./views/AddSynonymView.vue'),
    meta: {
      title: 'Add Global Synonym',
      icon: 'mdi-swap-horizontal'
    }
  },
  {
    path: '/globals/stopwords/add',
    name: 'add-global-stopword',
    component: () => import('./views/AddStopwordView.vue'),
    meta: {
      title: 'Add Global Stopword',
      icon: 'mdi-text-box-remove-outline'
    }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('./views/ServerProfileView.vue'),
    meta: {
      title: 'Dashboard',
      icon: 'mdi-view-dashboard'
    }
  },
  {
    path: '/connections',
    name: 'connections',
    component: () => import('./views/ConnectionsView.vue'),
    meta: {
      title: 'Connections',
      icon: 'mdi-network'
    }
  },
  {
    path: '/links',
    name: 'links',
    component: () => import('./views/LinksView.vue'),
    meta: {
      title: 'Cluster Links',
      icon: 'mdi-lan'
    }
  },
  {
    path: '/links/:node',
    name: 'links-node',
    component: () => import('./views/LinksView.vue'),
    props: true,
    meta: {
      title: 'Cluster Links',
      icon: 'mdi-lan'
    }
  },
  {
    path: '/links/:node/:collection',
    name: 'links-node-collection',
    component: () => import('./views/LinksView.vue'),
    props: true,
    meta: {
      title: 'Cluster Links',
      icon: 'mdi-lan'
    }
  },
  {
    path: '/status',
    name: 'status',
    component: () => import('./views/StatusView.vue'),
    meta: {
      title: 'Server Status',
      icon: 'mdi-heart-pulse'
    }
  },
  {
    path: '/tests',
    name: 'tests',
    component: () => import('./views/TestsView.vue'),
    meta: {
      title: 'Tests',
      icon: 'mdi-test-tube'
    }
  },
  {
    path: '/server-profile',
    name: 'server-profile',
    redirect: '/dashboard'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('./views/NotFound.vue'),
    meta: {
      title: 'Page Not Found',
      icon: 'mdi-alert-circle'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(resolveRouterBase()),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Check server connection status
const checkServerStatus = async () => {
  try {
    const baseUrl = window.__HLQUERY_BASE_URL__ || 'http://localhost:9200'
    const useProxy = shouldUseProxy(baseUrl)
    const url = buildApiUrl(baseUrl, useProxy, '/health')
    
    const response = await axios.get(url, { 
      timeout: 5000,
      validateStatus: () => true // Don't throw on any status
    })
    
    return response.status === 200
  } catch (err) {
    return false
  }
}

// Update document title on route change and check server status
router.beforeEach(async (to, from) => {
  let title = to.meta?.title || 'hlquery'
  
  // For collection pages, include the collection name in the title
  if (to.params.name) {
    const collectionName = to.params.name
    if (to.name === 'collection-documents') {
      title = collectionName
    } else if (to.name === 'collection-search-syntax') {
      title = `${collectionName} - Search Syntax`
    } else if (to.name === 'collection-schema') {
      title = `${collectionName} - Schema`
    } else if (to.name === 'collection-details') {
      title = `${collectionName} - Details`
    } else if (to.name === 'add-document') {
      title = `${collectionName} - Add Document`
    } else if (to.name === 'add-synonym') {
      title = `${collectionName} - Add Synonym`
    } else if (to.name === 'add-stopword') {
      title = `${collectionName} - Add Stopword`
    } else if (to.name === 'document-detail' && to.params.docId) {
      title = `${collectionName} - ${to.params.docId}`
    }
  }
  
  // For search results, include query if available
  if (to.name === 'search-results' && to.query.q) {
    title = `Results - ${to.query.q}`
  } else if (to.name === 'collections-search' && to.params.query) {
    title = `Search - ${to.params.query}`
  }
  
  document.title = `hlquery - ${title}`
  
  // Don't redirect if already on status page
  if (to.path === '/status' || to.path === '/collections' || to.path === '/') {
    return true
  }
  
  // Don't check server status for collections route or sub-collections
  // This prevents redirect loops when navigating to collections
  // and ensures the collections page handles its own loading/error states
  if (to.path === '/collections' || to.path.startsWith('/collections/')) {
    return true
  }
  
  // Check server status for other routes
  const isConnected = await checkServerStatus()
  
  // If server is down, redirect to status page
  if (!isConnected) {
    return '/status'
  }
  
  // Server is up, continue normally
  return true
})

// Global error handler for navigation errors
router.onError((error) => {
  // Ignore NavigationDuplicated errors (common when clicking same route)
  if (error.name === 'NavigationDuplicated' || error.message?.includes('Avoided redundant navigation')) {
    return
  }
  
  // Ignore template string errors - these are usually false positives from Vue Router
  // when it tries to parse route params that contain special characters
  if (error.message?.includes('Unexpected template string') || 
      error.message?.includes('template string') ||
      error.name === 'SyntaxError' && error.message?.includes('template')) {
    // Silently ignore - the navigation will still work
    // Prevent the warning from being logged
    return
  }
  
  // Log other navigation errors for debugging
  console.error('Router navigation error:', error)
})

// Suppress Vue Router warnings for template string errors during initialization
// This is a known issue with Vue Router when route params contain special characters
if (typeof console !== 'undefined' && console.warn) {
  const originalWarn = console.warn
  console.warn = function(...args) {
    const message = args.join(' ')
    if (message.includes('Unexpected template string') || 
        message.includes('template string') ||
        (message.includes('Unexpected error when starting the router') && message.includes('template')) ||
        (message.includes('SyntaxError') && message.includes('template'))) {
      // Suppress this specific warning - navigation will still work
      return
    }
    // Call original warn for other messages
    originalWarn.apply(console, args)
  }
}

export default router
