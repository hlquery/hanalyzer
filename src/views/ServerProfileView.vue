<template>
  <div class="dashboard-view">
    <!-- Loading State -->
    <LoadingSkeleton v-if="loading" variant="card" :lines="6" />

    <!-- Error State -->
    <div v-if="error && !loading" class="error-state-wrap">
      <!-- Decorative background shapes -->
      <div class="bg-shape bg-triangle error-triangle"></div>
      <div class="bg-shape bg-circle error-circle"></div>
      <div class="bg-shape bg-hexagon error-hexagon"></div>
      
      <div class="error-card">
        <v-icon size="64" color="#ef4444" class="error-icon">mdi-alert-circle-outline</v-icon>
        <h1>Unable to Load Statistics</h1>
        <p>We couldn't connect to the server or retrieve the statistics. Please check your connection and try again.</p>
        <div class="error-actions">
          <v-btn
            @click="loadStats"
            color="primary"
            variant="flat"
            size="default"
            class="retry-btn"
          >
            <v-icon start>mdi-refresh</v-icon>
            Try Again
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-if="stats && !loading" class="dashboard-content">
      <div class="content-inner">
        <div class="collections-header">
          <div class="collections-title-section">
            <div>
              <h1 class="collections-title-text dashboard-title">Server Dashboard</h1>
            </div>
          </div>
          <div class="collections-header-actions dashboard-actions">
            <v-btn
              @click="loadStats"
              :disabled="loading"
              variant="flat"
              size="small"
              prepend-icon="mdi-refresh"
              class="collections-action-btn action-button refresh-header-btn"
            >
              <span class="dashboard-header-btn-label">Refresh</span>
            </v-btn>
            <v-btn
              @click="showFlushDialog = true"
              :disabled="!isConnected || flushing"
              variant="flat"
              size="small"
              color="error"
              prepend-icon="mdi-trash-can"
              class="collections-action-btn action-button flush-header-btn"
            >
              <span class="dashboard-header-btn-label" v-if="flushing">Flushing...</span>
              <span class="dashboard-header-btn-label" v-else>Flush All</span>
            </v-btn>
          </div>
        </div>

        <div class="critical-status-bar status-grid">
          <div class="critical-status-item status-card">
            <span class="status-dot" :class="isConnected ? 'status-dot-online' : 'status-dot-offline'"></span>
            <span class="critical-status-label">Server</span>
            <span class="critical-status-value">{{ isConnected ? 'Online' : 'Offline' }}</span>
          </div>
          <div class="critical-status-item status-card">
            <span class="critical-status-label">Ping</span>
            <span class="critical-status-value">{{ formatLatency(lastPingTime) }}</span>
          </div>
        </div>

        <div class="section-label section-title">Operational Metrics</div>
        <div class="dashboard-six-grid metrics-block metrics-section">
        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">CPU LOAD</div>
                <div class="kpi-value">{{ formatCpuPercent(cpuUsagePercent) }}</div>
                <div class="kpi-context">{{ cpuUsageLevel }} <span class="kpi-trend">{{ formatDelta(cpuTrendDelta, '% last window') }}</span></div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#f59e0b">mdi-chip</v-icon>
              </div>
            </div>
            <div class="cpu-usage-block">
              <div class="cpu-usage-track">
                <div class="cpu-usage-fill" :style="{ width: `${cpuUsagePercent}%` }"></div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">MEMORY</div>
                <div class="kpi-value">{{ formatBytesShort(stats.server?.memory_usage_bytes) }}</div>
                <div class="kpi-context">{{ formatDelta(memoryTrendDelta, 'MB last window') }}</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#10b981">mdi-memory</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">PING</div>
                <div class="kpi-value">{{ formatLatency(lastPingTime) }}</div>
                <div class="kpi-context">Avg {{ formatLatency(averageLatency) }}</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#06b6d4">mdi-pulse</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">COLLECTIONS</div>
                <div class="kpi-value">{{ formatNumber(stats.collections?.total || 0) }}</div>
                <div class="kpi-context">{{ formatNumber(totalDocuments) }} documents</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#8b5cf6">mdi-layers-triple</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

        <div class="section-label section-title">Storage & Index</div>
        <div class="dashboard-six-grid metrics-block metrics-section">
        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">DOCUMENTS</div>
                <div class="kpi-value-large">{{ formatNumber(totalDocuments) }}</div>
                <div class="kpi-context">{{ formatNumber(stats.collections?.total || 0) }} collections</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#3b82f6">mdi-file-document-multiple-outline</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">DATABASE SIZE</div>
                <div class="kpi-value-large">{{ formatBytesShort(databaseSizeBytes) }}</div>
                <div class="kpi-context">{{ formatBytesShort(sstableSizeBytes) }} SSTables</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#ef4444">mdi-database</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">SSTABLES</div>
                <div class="kpi-value-large">{{ formatNumber(sstableCount) }}</div>
                <div class="kpi-context">{{ formatBytesShort(sstableSizeBytes) }} on disk</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#8b5cf6">mdi-layers-triple</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">MEMTABLE</div>
                <div class="kpi-value-large">{{ formatBytesShort(memtableSizeBytes) }}</div>
                <div class="kpi-context">Write buffer</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#14b8a6">mdi-memory</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">UPTIME</div>
                <v-tooltip location="top" v-if="stats?.server?.startup_time && resolvedUptimeSeconds > 0">
                  <template v-slot:activator="{ props }">
                    <div v-bind="props" class="kpi-value-large">{{ formatUptime(resolvedUptimeSeconds) }}</div>
                  </template>
                  <span>Started: {{ formatStartTime(stats.server.startup_time) }}</span>
                </v-tooltip>
                <div v-else-if="resolvedUptimeSeconds > 0" class="kpi-value-large">{{ formatUptime(resolvedUptimeSeconds) }}</div>
                <div class="kpi-context">{{ uptimeContextLabel }}</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#0f766e">mdi-server</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="dashboard-kpi-card metric-card">
          <v-card-text class="pa-4">
            <div class="kpi-topline">
              <div class="flex-grow-1">
                <div class="kpi-label">I/O BYTES</div>
                <div class="kpi-value-large">{{ formatBytesShort(stats.io?.total_bytes_processed || 0) }}</div>
                <div class="kpi-context">Network + disk activity</div>
              </div>
              <div class="kpi-icon-minimal">
                <v-icon color="#2563eb">mdi-swap-horizontal-bold</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

        <!-- Detailed Stats Cards -->
        <v-row class="detail-grid-row">
        <v-col cols="12" md="6">
          <v-card class="dashboard-detail-card metric-card">
            <v-card-title class="d-flex align-center pa-4 detail-card-header">
              <v-icon class="detail-card-icon">mdi-server</v-icon>
              <span class="detail-card-title">Server Information</span>
            </v-card-title>
            <v-card-text class="pa-4">
              <div class="stats-list">
                <div class="stats-item stats-item-first">
                  <div class="stats-item-label">Server URL</div>
                  <a
                    v-if="serverUrlHref"
                    :href="serverUrlHref"
                    class="stats-item-value stats-item-link text-truncate"
                    style="max-width: 200px;"
                    :title="displayServerUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ displayServerUrl }}
                  </a>
                  <div
                    v-else
                    class="stats-item-value text-truncate"
                    style="max-width: 200px;"
                    :title="displayServerUrl"
                  >
                    {{ displayServerUrl }}
                  </div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">Memory Usage</div>
                  <div class="stats-item-value">{{ formatBytes(stats.server?.memory_usage_bytes) }}</div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">CPU Usage</div>
                  <div class="stats-item-value">{{ formatCpuPercent(cpuUsagePercent) }}</div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">Socket Engine</div>
                  <div class="stats-item-value">
                    <v-chip 
                      :color="getSocketEngineColor(getSocketEngine(stats?.health))" 
                      size="small" 
                      variant="flat"
                    >
                      {{ getSocketEngine(stats?.health) || 'Unknown' }}
                    </v-chip>
                  </div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">Authentication</div>
                  <div class="stats-item-value">
                    <v-chip 
                      :color="hasAuth ? 'success' : 'default'" 
                      size="small" 
                      variant="flat"
                    >
                      {{ hasAuth ? 'Enabled' : 'Not Configured' }}
                    </v-chip>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="dashboard-detail-card metric-card">
            <v-card-title class="d-flex align-center pa-4 detail-card-header">
              <v-icon class="detail-card-icon">mdi-database</v-icon>
              <span class="detail-card-title">Database Statistics</span>
            </v-card-title>
            <v-card-text class="pa-4">
              <div class="stats-list">
                <div class="stats-item">
                  <div class="stats-item-label">Total Size</div>
                  <div class="stats-item-value">{{ formatBytes(databaseSizeBytes) }}</div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">Documents Size</div>
                  <div class="stats-item-value">{{ formatBytes(documentSizeBytes) }}</div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">SSTable Size</div>
                  <div class="stats-item-value">{{ formatBytes(sstableSizeBytes) }}</div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">SSTable Count</div>
                  <div class="stats-item-value">{{ sstableCount }}</div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="stats-item">
                  <div class="stats-item-label">Memtable Size</div>
                  <div class="stats-item-value">{{ formatBytes(memtableSizeBytes) }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
        </v-row>

        <v-row class="detail-grid-row detail-grid-row-single">
        <v-col cols="12">
          <section class="dashboard-settings-section metric-card">
            <div class="dashboard-settings-header">
              <v-icon class="detail-card-icon">mdi-puzzle</v-icon>
              <span class="detail-card-title">Modules</span>
            </div>
            <div class="dashboard-settings-table-wrap">
              <v-table class="dashboard-settings-table">
                <tbody>
                  <tr>
                    <td>Loaded Modules</td>
                    <td class="text-right">{{ formatNumber(loadedModules.length) }}</td>
                  </tr>
                  <tr>
                    <td>Module Names</td>
                    <td class="text-right">
                      <div v-if="loadedModules.length > 0" class="dashboard-module-chip-wrap">
                        <v-chip
                          v-for="moduleName in loadedModules"
                          :key="moduleName"
                          size="small"
                          variant="flat"
                          color="primary"
                          class="dashboard-module-chip"
                        >
                          {{ moduleName }}
                        </v-chip>
                      </div>
                      <span v-else class="text-medium-emphasis">No loaded modules reported</span>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </section>
        </v-col>
        </v-row>

        <!-- Search Configuration Settings as Table -->
        <v-row class="detail-grid-row detail-grid-row-single">
        <v-col cols="12">
          <section class="dashboard-settings-section metric-card">
            <div class="dashboard-settings-header">
              <v-icon class="detail-card-icon">mdi-magnify</v-icon>
              <span class="detail-card-title">Search Engine Settings</span>
            </div>
            <div class="dashboard-settings-table-wrap">
              <v-table class="dashboard-settings-table">
                <tbody>
                  <tr>
                    <td>Algorithm</td>
                    <td class="text-right">{{ searchConfig?.algorithm || 'bm25+' }}</td>
                  </tr>
                  <tr>
                    <td>K1</td>
                    <td class="text-right">{{ searchConfig?.k1 || '1.2' }}</td>
                  </tr>
                  <tr>
                    <td>B</td>
                    <td class="text-right">{{ searchConfig?.b || '0.75' }}</td>
                  </tr>
                  <tr>
                    <td>Delta</td>
                    <td class="text-right">{{ searchConfig?.delta || '1.0' }}</td>
                  </tr>
                  <tr>
                    <td>Max Query Length</td>
                    <td class="text-right">{{ searchConfig?.max_query_length || '1000' }} chars</td>
                  </tr>
                  <tr>
                    <td>Max Query Terms</td>
                    <td class="text-right">{{ searchConfig?.max_query_terms || '50' }}</td>
                  </tr>
                  <tr>
                    <td>Stemming</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.enable_stemming !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.enable_stemming !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Synonyms</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.enable_synonyms !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.enable_synonyms !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Fuzzy Matching</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.enable_fuzzy ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.enable_fuzzy ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Default Limit</td>
                    <td class="text-right">{{ searchConfig?.default_limit === 0 ? 'Unlimited' : (searchConfig?.default_limit || '0') }}</td>
                  </tr>
                  <tr>
                    <td>Max Limit</td>
                    <td class="text-right">{{ searchConfig?.max_limit || '1000' }}</td>
                  </tr>
                  <tr>
                    <td>Min Limit</td>
                    <td class="text-right">{{ searchConfig?.min_limit || '1' }}</td>
                  </tr>
                  <tr>
                    <td>Max Offset</td>
                    <td class="text-right">{{ formatNumber(searchConfig?.max_offset || 100000) }}</td>
                  </tr>
                  <tr>
                    <td>IDF Cache</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.idf_cache !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.idf_cache !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Doc Length Cache</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.doc_length_cache !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.doc_length_cache !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Max Cache Size</td>
                    <td class="text-right">{{ searchConfig?.max_cache_size_mb || '512' }} MB</td>
                  </tr>
                  <tr>
                    <td>Cache TTL</td>
                    <td class="text-right">{{ formatCacheTTL(searchConfig?.cache_ttl_seconds || 3600) }}</td>
                  </tr>
                  <tr>
                    <td>Query Timeout</td>
                    <td class="text-right">{{ searchConfig?.query_timeout_ms || '5000' }} ms</td>
                  </tr>
                  <tr>
                    <td>Indexing Timeout</td>
                    <td class="text-right">{{ searchConfig?.indexing_timeout_ms || '30000' }} ms</td>
                  </tr>
                  <tr>
                    <td>Max Candidates</td>
                    <td class="text-right">{{ formatNumber(searchConfig?.max_candidates || 10000) }}</td>
                  </tr>
                  <tr>
                    <td>Min Candidates</td>
                    <td class="text-right">{{ searchConfig?.min_candidates || '10' }}</td>
                  </tr>
                  <tr>
                    <td>Min Score Threshold</td>
                    <td class="text-right">{{ searchConfig?.min_score_threshold || '0.0' }}</td>
                  </tr>
                  <tr>
                    <td>Normalize Scores</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.normalize_scores !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.normalize_scores !== false ? 'Yes' : 'No' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Score Precision</td>
                    <td class="text-right">{{ searchConfig?.score_precision || '6' }} decimals</td>
                  </tr>
                  <tr>
                    <td>Score Explanation</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.enable_score_explanation ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.enable_score_explanation ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Wildcards</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.enable_wildcards !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.enable_wildcards !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Prefix Matching</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.enable_prefix_matching !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.enable_prefix_matching !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Store Positions</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.store_positions !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.store_positions !== false ? 'Yes' : 'No' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Store Offsets</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.store_offsets ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.store_offsets ? 'Yes' : 'No' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Track Total Hits</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.track_total_hits !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.track_total_hits !== false ? 'Yes' : 'No' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Track Scores</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.track_scores !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.track_scores !== false ? 'Yes' : 'No' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Request Cache</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.request_cache !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.request_cache !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Partial Results</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.allow_partial_search_results !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.allow_partial_search_results !== false ? 'Allowed' : 'Not Allowed' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Log Queries</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.log_queries ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.log_queries ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Log Slow Queries</td>
                    <td class="text-right">
                      <v-chip :color="searchConfig?.log_slow_queries !== false ? 'success' : 'default'" size="x-small" variant="flat">
                        {{ searchConfig?.log_slow_queries !== false ? 'Enabled' : 'Disabled' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td>Slow Query Threshold</td>
                    <td class="text-right">{{ searchConfig?.slow_query_threshold_ms || '1000' }} ms</td>
                  </tr>
                  <tr>
                    <td>Log Level</td>
                    <td class="text-right">{{ getLogLevelName(searchConfig?.log_level || 1) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </section>
        </v-col>
        </v-row>
      </div>
    </div>

    <!-- Flush All Data Confirmation Dialog -->
    <v-dialog
      v-model="showFlushDialog"
      max-width="560"
      persistent
      class="flush-data-dialog"
    >
      <v-card class="flush-dialog-card" elevation="2">
        <v-card-title class="flush-dialog-header">
          <div class="flush-dialog-icon-wrapper">
            <v-icon icon="mdi-alert-circle" size="28" class="flush-dialog-icon"></v-icon>
          </div>
          <div class="flush-dialog-title-content">
            <span class="flush-dialog-title">Flush All</span>
            <span class="flush-dialog-subtitle">This action cannot be undone</span>
          </div>
        </v-card-title>
        <v-card-text class="flush-dialog-content">
          <div class="flush-warning-text">
            You are about to permanently delete ALL data from the server. This action cannot be reversed.
          </div>
          <v-card variant="outlined" class="flush-data-info-card">
            <div class="flush-info-row">
              <div class="flush-info-label">
                <v-icon icon="mdi-folder" size="18" class="mr-1"></v-icon>
                Collections
              </div>
              <div class="flush-info-value">
                {{ stats?.collections?.total || 0 }} {{ (stats?.collections?.total || 0) === 1 ? 'collection' : 'collections' }} will be deleted
              </div>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="flush-info-row">
              <div class="flush-info-label">
                <v-icon icon="mdi-file-document-multiple" size="18" class="mr-1"></v-icon>
                Documents
              </div>
              <div class="flush-info-value">
                {{ formatNumber(totalDocuments) }} {{ totalDocuments === 1 ? 'document' : 'documents' }} will be deleted
              </div>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="flush-info-row">
              <div class="flush-info-label">
                <v-icon icon="mdi-database" size="18" class="mr-1"></v-icon>
                Database & Indexes
              </div>
              <div class="flush-info-value">
                {{ getDatabaseName() }} will be cleared
              </div>
            </div>
            <v-divider class="my-3"></v-divider>
            <div class="flush-info-row">
              <div class="flush-info-label">
                <v-icon icon="mdi-cached" size="18" class="mr-1"></v-icon>
                All Caches
              </div>
              <div class="flush-info-value">Will be cleared</div>
            </div>
          </v-card>
          <v-alert
            v-if="flushError"
            type="error"
            variant="tonal"
            class="flush-error-alert mt-4"
            closable
            @click:close="flushError = null"
            density="compact"
          >
            <div class="flush-error-title">Flush Failed</div>
            <div class="flush-error-message">{{ flushError }}</div>
            <div class="flush-error-help">Please check your connection and try again. If the problem persists, contact support.</div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="flush-dialog-actions">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="closeFlushDialog"
            :disabled="flushing"
            class="unified-btn unified-btn-secondary"
            size="default"
          >
            Cancel
          </v-btn>
          <v-btn
            variant="flat"
            @click="handleFlush"
            :loading="flushing"
            :disabled="flushing"
            prepend-icon="mdi-trash-can"
            class="unified-btn unified-btn-danger flush-btn-left"
            size="default"
          >
            Flush All
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAuth } from '../composables/useAuth'
import { useTimeSeries } from '../composables/useTimeSeries'
import { useToast } from '../composables/useToast'
import { useConnectionStatus } from '../composables/useConnectionStatus'
import { useCollections } from '../composables/useCollections'
import { getBaseUrlValue, shouldUseProxy, buildApiUrl } from '../utils/apiHelpers'
import { extractSafeErrorMessage } from '../utils/sanitize'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'

const router = useRouter()
const baseUrl = inject('baseUrl', ref('http://localhost:9200'))
const { getAuthForServer, loadAuthFromStorage } = useAuth()
const { showToast } = useToast()
const { isConnected, lastPingTime, latencyHistory } = useConnectionStatus(baseUrl)
const { loadCollectionsAsync } = useCollections(baseUrl)

const flushing = ref(false)
const showFlushDialog = ref(false)
const flushError = ref(null)

// Expose openServerMenu function (will be set by AppHeader)
const openServerMenu = () => {
  // This will be handled by AppHeader's server menu
  // For now, just navigate to show the menu would open
  window.dispatchEvent(new CustomEvent('open-server-menu'))
}

// Check if authentication is configured
const hasAuth = computed(() => {
  const url = baseUrl?.value || baseUrl
  const auth = getAuthForServer(url) || loadAuthFromStorage(url)
  return !!(auth && (auth.token || auth.apiKey))
})

const getDisplayServerUrl = () => {
  const rawBaseUrl = getBaseUrlValue(baseUrl)
  if (!rawBaseUrl) return 'http://localhost:9200'

  if (!rawBaseUrl.startsWith('/')) {
    return rawBaseUrl.replace(/\/+$/, '')
  }

  if (typeof window === 'undefined') {
    return rawBaseUrl
  }

  const runtimeBaseUrl = typeof window.__HLQUERY_BASE_URL__ === 'string'
    ? window.__HLQUERY_BASE_URL__.trim()
    : ''

  if (runtimeBaseUrl && runtimeBaseUrl !== rawBaseUrl && !runtimeBaseUrl.startsWith('/')) {
    return runtimeBaseUrl.replace(/\/+$/, '')
  }

  return window.location.origin || rawBaseUrl
}

const displayServerUrl = computed(() => getDisplayServerUrl())
const serverUrlHref = computed(() => {
  const resolvedUrl = displayServerUrl.value

  try {
    const parsed = new URL(resolvedUrl)
    return /^https?:$/.test(parsed.protocol) ? parsed.href : ''
  } catch {
    return ''
  }
})

const displayServerLabel = computed(() => {
  const resolvedUrl = displayServerUrl.value

  try {
    const parsed = new URL(resolvedUrl)
    return parsed.host || resolvedUrl
  } catch {
    return resolvedUrl.replace(/^https?:\/\//, '')
  }
})

const resolvedUptimeSeconds = computed(() => {
  const liveUptime = Number(currentUptime.value)
  if (Number.isFinite(liveUptime) && liveUptime > 0) {
    return liveUptime
  }

  const serverUptime = Number(stats.value?.server?.uptime_seconds)
  if (Number.isFinite(serverUptime) && serverUptime > 0) {
    return serverUptime
  }

  const rootUptime = Number(stats.value?.uptime_seconds)
  if (Number.isFinite(rootUptime) && rootUptime > 0) {
    return rootUptime
  }

  return 0
})

const uptimeContextLabel = computed(() => {
  if (resolvedUptimeSeconds.value > 0) {
    return 'Live server runtime'
  }

  return displayServerLabel.value
})

const stats = ref(null)
const loading = ref(false)
const error = ref(null)
const totalDocuments = ref(0)
const searchConfig = ref(null)
const searchConfigUnavailable = ref(false)
const loadedModules = computed(() => {
  const names = stats.value?.health?.loaded_modules
  if (!Array.isArray(names)) {
    return []
  }

  return names
    .filter((entry) => typeof entry === 'string' && entry.trim())
    .map((entry) => entry.trim())
})

// Uptime tracking - store base value and timestamp to keep it ticking
const baseUptimeSeconds = ref(0)
const baseUptimeTimestamp = ref(0)
const uptimeInterval = ref(null)
const currentUptime = ref(0)
const statsUpdateInterval = ref(null)

// Time-series data for charts
const memoryHistory = useTimeSeries(30)
const cpuHistory = useTimeSeries(30)

const getDefaultSearchConfig = () => ({
  algorithm: 'bm25+',
  k1: '1.2',
  b: '0.75',
  delta: '1.0',
  max_query_length: '1000',
  max_query_terms: '50',
  enable_stemming: true,
  enable_synonyms: true,
  enable_fuzzy: false,
  default_limit: 0,
  max_limit: '1000',
  min_limit: '1',
  max_offset: 100000,
  idf_cache: true,
  doc_length_cache: true,
  max_cache_size_mb: '512',
  cache_ttl_seconds: 3600,
  query_timeout_ms: '5000',
  indexing_timeout_ms: '30000',
  max_candidates: 10000,
  min_candidates: '10',
  min_score_threshold: '0.0',
  normalize_scores: true,
  score_precision: '6',
  enable_score_explanation: false,
  enable_wildcards: true,
  enable_prefix_matching: true,
  store_positions: true,
  store_offsets: false,
  track_total_hits: true,
  track_scores: true,
  request_cache: true,
  allow_partial_search_results: true,
  log_queries: false,
  log_slow_queries: true,
  slow_query_threshold_ms: '1000',
  log_level: 1
})

const getNumericStat = (...values) => {
  for (const value of values) {
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) {
      return num
    }
  }
  return 0
}

const cpuUsagePercent = computed(() => {
  const raw = Number(stats.value?.server?.cpu_usage_percent ?? 0)
  if (!Number.isFinite(raw) || raw < 0) return 0
  return Math.min(raw, 100)
})

const cpuUsageLevel = computed(() => {
  if (cpuUsagePercent.value >= 80) return 'High'
  if (cpuUsagePercent.value >= 40) return 'Moderate'
  if (cpuUsagePercent.value > 0) return 'Low'
  return 'Idle'
})

const databaseSizeBytes = computed(() => {
  const rocksdb = stats.value?.rocksdb || {}
  const documents = getNumericStat(rocksdb.documents_size)
  const memtable = getNumericStat(rocksdb.memtable_size)
  const sstable = getNumericStat(rocksdb.sstable_size, rocksdb.bytes_written)
  const directTotal = getNumericStat(rocksdb.total_size, rocksdb.total_db_size, rocksdb.rocksdb_size)
  const reconstructedTotal = documents + memtable + sstable

  return Math.max(directTotal, reconstructedTotal)
})

const documentSizeBytes = computed(() => getNumericStat(stats.value?.rocksdb?.documents_size))
const sstableSizeBytes = computed(() => getNumericStat(
  stats.value?.rocksdb?.sstable_size,
  stats.value?.rocksdb?.bytes_written
))
const memtableSizeBytes = computed(() => getNumericStat(stats.value?.rocksdb?.memtable_size))
const sstableCount = computed(() => {
  const raw = Number(stats.value?.rocksdb?.sstable_count ?? 0)
  return Number.isFinite(raw) && raw > 0 ? raw : 0
})

const averageLatency = computed(() => {
  const points = latencyHistory.value || []
  if (!points.length) return null
  const total = points.reduce((sum, point) => sum + (Number(point.latency) || 0), 0)
  return total / points.length
})

const getSeriesDelta = (series) => {
  const points = series?.data?.value || []
  if (points.length < 2) return 0
  const first = Number(points[0]) || 0
  const last = Number(points[points.length - 1]) || 0
  return Math.round((last - first) * 10) / 10
}

const cpuTrendDelta = computed(() => getSeriesDelta(cpuHistory))
const memoryTrendDelta = computed(() => getSeriesDelta(memoryHistory))

const loadSearchConfig = async (baseUrlValue, useProxy, { silent = false } = {}) => {
  if (searchConfigUnavailable.value) {
    if (!searchConfig.value) {
      searchConfig.value = getDefaultSearchConfig()
    }
    return
  }

  try {
    const configUrl = buildApiUrl(baseUrlValue, useProxy, '/search-config')
    const configResponse = await axios.get(configUrl, { timeout: 3000 })
    if (configResponse.data && typeof configResponse.data === 'object' && !Array.isArray(configResponse.data)) {
      searchConfig.value = configResponse.data
      return
    }

    searchConfigUnavailable.value = true
  } catch (err) {
    if ([400, 404, 405, 406].includes(err?.response?.status)) {
      searchConfigUnavailable.value = true
    }
    if (!silent) {
      console.warn('Search config not available:', err)
    }
  }

  if (!searchConfig.value) {
    searchConfig.value = getDefaultSearchConfig()
  }
}

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatBytesShort = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = Math.round(bytes / Math.pow(k, i) * 10) / 10
  return val + ' ' + sizes[i]
}

const formatCpuPercent = (value) => `${Number(value || 0).toFixed(1)}%`
const formatPercentValue = (value) => `${Number(value || 0).toFixed(1)}%`

const formatLatency = (value) => {
  const latency = Number(value)
  if (!Number.isFinite(latency) || latency < 0) return '-'
  return `${Math.round(latency)} ms`
}

const formatDelta = (value, suffix = '') => {
  const delta = Number(value || 0)
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}${suffix ? ` ${suffix}` : ''}`
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString()
}

const formatUptime = (seconds) => {
  if (!seconds || seconds === 0) return ''
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ')
}

const formatStartTime = (timestamp) => {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}


const formatPercent = (rate) => {
  if (!rate && rate !== 0) return '0%'
  return `${rate.toFixed(1)}%`
}

const formatCacheTTL = (seconds) => {
  if (!seconds) return '0s'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const getLogLevelName = (level) => {
  const levels = ['None', 'Errors', 'Warnings', 'All']
  return levels[level] || 'Unknown'
}

const getSocketEngineColor = (engine) => {
  if (!engine) return 'default'
  const engineLower = engine.toLowerCase()
  if (engineLower === 'epoll') return 'primary'
  if (engineLower === 'poll') return 'warning'
  if (engineLower === 'kqueue') return 'info'
  return 'default'
}

const normalizeEngineValue = (value) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === 'unknown' || normalized === 'hlquery') return ''
  return normalized
}

const getSocketEngine = (health) => {
  if (!health || typeof health !== 'object') return ''
  return normalizeEngineValue(health.socket_engine || health.engine)
}

const mergeHealthWithEngineFallback = (payload, healthOverride = null) => {
  const health = (healthOverride && typeof healthOverride === 'object')
    ? { ...healthOverride }
    : ((payload?.health && typeof payload.health === 'object') ? { ...payload.health } : {})

  const engine = normalizeEngineValue(
    health.socket_engine ||
    health.engine ||
    payload?.socket_engine ||
    payload?.engine ||
    payload?.stats?.socket_engine ||
    payload?.stats?.engine
  )

  if (engine) {
    health.socket_engine = engine
  }

  return health
}

const getServerStatsFromStatusPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null
  if (payload.stats?.server && typeof payload.stats.server === 'object') return payload.stats.server
  if (payload.stats && typeof payload.stats === 'object') return payload.stats
  if (payload.server && typeof payload.server === 'object') return payload.server
  return null
}

const hasUsableServerStats = (payload) => {
  const statsObj = payload && typeof payload === 'object' ? payload : null
  if (!statsObj) return false

  const directUptime = Number(statsObj?.uptime_seconds)
  if (Number.isFinite(directUptime) && directUptime > 0) {
    return true
  }

  const nestedUptime = Number(statsObj?.server?.uptime_seconds)
  if (Number.isFinite(nestedUptime) && nestedUptime > 0) {
    return true
  }

  return false
}

const fetchStatsSnapshot = async (baseUrlValue, useProxy) => {
  const statsUrl = buildApiUrl(baseUrlValue, useProxy, '/stats')
  const response = await axios.get(statsUrl, { timeout: 3000 })
  return response.data || {}
}

const buildMergedStatsPayload = async (statusPayload, baseUrlValue, useProxy) => {
  const mergedPayload = (statusPayload && typeof statusPayload === 'object')
    ? { ...statusPayload }
    : {}

  const statusStats = (mergedPayload.stats && typeof mergedPayload.stats === 'object')
    ? mergedPayload.stats
    : {}

  if (hasUsableServerStats(statusStats)) {
    mergedPayload.stats = statusStats
    return mergedPayload
  }

  try {
    const statsSnapshot = await fetchStatsSnapshot(baseUrlValue, useProxy)
    mergedPayload.stats = {
      ...statsSnapshot,
      ...statusStats,
      io: {
        ...(statsSnapshot?.io || {}),
        ...(statusStats?.io || {})
      }
    }
  } catch (e) {
    mergedPayload.stats = statusStats
  }

  return mergedPayload
}

const fetchHealthSnapshot = async (baseUrlValue, useProxy) => {
  const healthUrl = buildApiUrl(baseUrlValue, useProxy, '/health')
  const response = await axios.get(healthUrl, { timeout: 3000 })
  return mergeHealthWithEngineFallback(response.data || {}, response.data || {})
}

const getMemoryPercent = (used, total) => {
  if (!used || !total) return 0
  return Math.round((used / total) * 100)
}

const getDatabaseName = () => {
  // Try to get database information from stats
  // Check multiple possible locations in the response
  if (stats.value?.database?.name) {
    return stats.value.database.name
  }
  if (stats.value?.database?.data_dir) {
    // Extract name from path if available
    const path = stats.value.database.data_dir
    const parts = path.split('/').filter(p => p)
    if (parts.length > 0) {
      return parts[parts.length - 1]
    }
    return path // Return full path if can't extract name
  }
  if (stats.value?.server?.data_dir) {
    // Check if data_dir is in server object
    const path = stats.value.server.data_dir
    const parts = path.split('/').filter(p => p)
    if (parts.length > 0) {
      return parts[parts.length - 1]
    }
    return path
  }
  if (stats.value?.database?.engine) {
    // Use engine name with "Data" suffix
    const engine = stats.value.database.engine
    return engine.charAt(0).toUpperCase() + engine.slice(1) + ' Data'
  }
  if (stats.value?.rocksdb) {
    // If RocksDB stats exist, database is likely RocksDB-based
    return 'RocksDB Data'
  }
  // Default fallback - show generic name
  return 'Database & Indexes'
}

const loadTotalDocuments = async (baseUrlValue, useProxy) => {
  try {
    const doctotalUrl = useProxy ? '/api/doctotal' : `${baseUrlValue}/doctotal`
    try {
      const doctotalResponse = await axios.get(doctotalUrl, { timeout: 3000 })
      if (doctotalResponse.data?.doctotal !== undefined) {
        totalDocuments.value = doctotalResponse.data.doctotal
        return
      }
    } catch (e) {
      // Endpoint doesn't exist, fall back to calculating from collections
    }
    
    const collectionsUrl = useProxy ? '/api/collections' : `${baseUrlValue}/collections`
    const collectionsResponse = await axios.get(collectionsUrl, { timeout: 5000 })
    
    if (collectionsResponse.data?.collections) {
      let total = 0
      for (const collection of collectionsResponse.data.collections) {
        total += collection.num_documents || 0
      }
      totalDocuments.value = total
    }
  } catch (err) {
    console.warn('Failed to load total documents:', err)
  }
}

// Silent background stats update - doesn't show loading or error states
const updateStatsSilently = async () => {
  // Don't update if manual loading is in progress or if flushing
  if (loading.value || flushing.value) {
    return
  }
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      return
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    
    // Use /status endpoint which combines health and stats
    const url = buildApiUrl(baseUrlValue, useProxy, '/status')
    
    const response = await axios.get(url, { timeout: 5000 })
    const payload = await buildMergedStatsPayload(response.data, baseUrlValue, useProxy)

    if (payload) {
      // Update stats silently without triggering loading state
      let normalizedHealth = mergeHealthWithEngineFallback(payload)
      if (!getSocketEngine(normalizedHealth)) {
        try {
          normalizedHealth = await fetchHealthSnapshot(baseUrlValue, useProxy)
        } catch (e) {
          // Ignore health fallback errors in silent refresh.
        }
      }

      if (payload.stats) {
        stats.value = {
          ...payload.stats,
          health: normalizedHealth
        }
      } else {
        // Fallback: if stats is not nested, use root level data
        stats.value = {
          ...payload,
          health: normalizedHealth
        }
      }
      
      const serverStats = getServerStatsFromStatusPayload(payload)

      // Update base uptime values to keep it ticking continuously
      if (serverStats?.uptime_seconds !== undefined) {
        baseUptimeSeconds.value = serverStats.uptime_seconds
        baseUptimeTimestamp.value = Date.now()
        currentUptime.value = serverStats.uptime_seconds
      }
      
      // Add data points to time-series charts
      if (serverStats?.memory_usage_bytes !== undefined && serverStats?.memory_usage_bytes !== null) {
        const memoryMB = Number(serverStats.memory_usage_bytes) / (1024 * 1024)
        memoryHistory.addPoint(Math.round(memoryMB * 10) / 10)
      }
      if (serverStats?.cpu_usage_percent !== undefined && serverStats?.cpu_usage_percent !== null) {
        cpuHistory.addPoint(Math.round(Number(serverStats.cpu_usage_percent) * 10) / 10)
      }
    }
    
    // Silently update total documents
    await loadTotalDocuments(baseUrlValue, useProxy)
    
    await loadSearchConfig(baseUrlValue, useProxy, { silent: true })
  } catch (err) {
    // Silently fail - don't show errors or log for background updates
    // Errors are silently ignored to prevent UI interruption
  }
}

const loadStats = async () => {
  loading.value = true
  error.value = null
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      error.value = 'Invalid server URL configuration'
      loading.value = false
      return
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    
    // Use /status endpoint which combines health and stats
    const url = buildApiUrl(baseUrlValue, useProxy, '/status')
    
    const response = await axios.get(url, { timeout: 5000 })
    const payload = await buildMergedStatsPayload(response.data, baseUrlValue, useProxy)

    if (payload) {
      // /status returns { health: {...}, stats: {...} }
      // The stats object contains: server, collections, cache, rocksdb, io
      // /status returns { health: {...}, stats: {...} }
      // The stats object contains: server, collections, cache, rocksdb, io
      let normalizedHealth = mergeHealthWithEngineFallback(payload)
      if (!getSocketEngine(normalizedHealth)) {
        try {
          normalizedHealth = await fetchHealthSnapshot(baseUrlValue, useProxy)
        } catch (e) {
          // Ignore; UI can still render with partial status data.
        }
      }

      if (payload.stats) {
        stats.value = {
          ...payload.stats,
          health: normalizedHealth
        }
      } else {
        // Fallback: if stats is not nested, use root level data
        stats.value = {
          ...payload,
          health: normalizedHealth
        }
      }
      
      // Debug: log if rocksdb data is missing or zero
      if (stats.value && (!stats.value.rocksdb || (!stats.value.rocksdb.total_size && !stats.value.rocksdb.bytes_written))) {
        console.warn('RocksDB stats missing or zero:', stats.value.rocksdb)
      }
      
      const serverStats = getServerStatsFromStatusPayload(payload)

      // Update base uptime values to keep it ticking continuously
      // Store the server's uptime value and timestamp, then increment client-side
      if (serverStats?.uptime_seconds !== undefined) {
        baseUptimeSeconds.value = serverStats.uptime_seconds
        baseUptimeTimestamp.value = Date.now()
        currentUptime.value = serverStats.uptime_seconds
      }
      
      // Add data points to time-series charts
      if (serverStats?.memory_usage_bytes !== undefined && serverStats?.memory_usage_bytes !== null) {
        const memoryMB = Number(serverStats.memory_usage_bytes) / (1024 * 1024)
        memoryHistory.addPoint(Math.round(memoryMB * 10) / 10)
      }
      if (serverStats?.cpu_usage_percent !== undefined && serverStats?.cpu_usage_percent !== null) {
        cpuHistory.addPoint(Math.round(Number(serverStats.cpu_usage_percent) * 10) / 10)
      }
    }
    
    await loadTotalDocuments(baseUrlValue, useProxy)
    
    await loadSearchConfig(baseUrlValue, useProxy)
  } catch (err) {
    error.value = extractSafeErrorMessage(err, 'Connection error')
    console.error('Error loading stats:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
  
  // Update uptime display every second using pure JavaScript (no server queries)
  // This increments the uptime client-side based on the initial server value
  // Only increments when server is connected
  uptimeInterval.value = setInterval(() => {
    // Don't increment uptime if server is disconnected
    if (!isConnected.value) {
      return
    }
    
    if (baseUptimeSeconds.value > 0 && baseUptimeTimestamp.value > 0) {
      // Calculate elapsed time since we got the base value
      const elapsed = Math.floor((Date.now() - baseUptimeTimestamp.value) / 1000)
      currentUptime.value = baseUptimeSeconds.value + elapsed
    } else if (stats.value?.server?.uptime_seconds !== undefined) {
      // Fallback: if base values aren't set yet, use API value
      // But also set base values so next tick will use client-side calculation
      if (baseUptimeSeconds.value === 0) {
        baseUptimeSeconds.value = stats.value.server.uptime_seconds
        baseUptimeTimestamp.value = Date.now()
      }
      currentUptime.value = stats.value.server.uptime_seconds
    }
  }, 1000)
  
  // Background stats updater - runs every 5 seconds silently
  // Only updates when not manually loading and not flushing
  statsUpdateInterval.value = setInterval(() => {
    updateStatsSilently()
  }, 5000)
  
})

const closeFlushDialog = () => {
  showFlushDialog.value = false
  flushError.value = null
  flushing.value = false
}

const handleFlush = async () => {
  flushing.value = true
  flushError.value = null
  
  try {
    const baseUrlValue = getBaseUrlValue(baseUrl)
    if (!baseUrlValue) {
      showToast('Invalid server URL configuration', 'error')
      return
    }
    
    const useProxy = shouldUseProxy(baseUrlValue)
    const flushUrl = buildApiUrl(baseUrlValue, useProxy, '/flush')
    
    const response = await axios.post(flushUrl, {}, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (response.status === 200 && response.data) {
      const data = response.data
      const collectionsDeleted = data.collections_deleted || 0
      
      showToast(
        `${collectionsDeleted} collection(s) removed.`,
        'success',
        'Flush Complete',
        6000
      )
      
      closeFlushDialog()
      
      // Reload stats and collections to reflect the flush
      setTimeout(() => {
        loadStats()
        loadCollectionsAsync()
      }, 500)
    } else {
      showToast('Flush completed but received unexpected response', 'warning')
      closeFlushDialog()
    }
  } catch (err) {
    console.error('Error flushing data:', err)
    const errorMsg = err.response?.data?.message || err.message || 'Failed to flush data'
    flushError.value = errorMsg
    showToast(`Flush failed: ${errorMsg}`, 'error', 'Flush Error', 6000)
  } finally {
    flushing.value = false
  }
}

onUnmounted(() => {
  if (uptimeInterval.value) {
    clearInterval(uptimeInterval.value)
    uptimeInterval.value = null
  }
  
  // Clean up background stats updater
  if (statsUpdateInterval.value) {
    clearInterval(statsUpdateInterval.value)
    statsUpdateInterval.value = null
  }
})
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html),
:global(body) {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

/* Dashboard View */
.dashboard-view {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
  overflow-x: clip;
}

/* Dashboard Header */
.dashboard-header {
  padding: 0;
}

.dashboard-title {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
}

.dashboard-subtitle {
  font-size: 16px;
  color: #64748b;
  font-weight: 400;
}

/* Flush button - softer red color with 3D effect */
.collections-action-btn.flush-header-btn {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%) !important;
  background-color: #dc2626 !important;
  color: #ffffff !important;
  box-shadow:
    0 4px 12px rgba(220, 38, 38, 0.25),
    0 2px 6px rgba(220, 38, 38, 0.2),
    0 1px 3px rgba(220, 38, 38, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
  outline: none !important;
  border: none !important;
  position: relative !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.collections-action-btn.flush-header-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

.collections-action-btn.flush-header-btn:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%) !important;
  background-color: #b91c1c !important;
  color: #ffffff !important;
  box-shadow:
    0 6px 16px rgba(220, 38, 38, 0.3),
    0 4px 10px rgba(220, 38, 38, 0.25),
    0 2px 4px rgba(220, 38, 38, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.12) !important;
  transform: none !important;
  outline: none !important;
}

.collections-action-btn.flush-header-btn:hover::before {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 50%);
}

.collections-action-btn.flush-header-btn:active {
  background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #6b1a1a 100%) !important;
  background-color: #991b1b !important;
  color: #ffffff !important;
  box-shadow:
    0 2px 6px rgba(220, 38, 38, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  transform: none !important;
  outline: none !important;
}

.collections-action-btn.flush-header-btn:active::before {
  opacity: 0.5;
}

.collections-action-btn.flush-header-btn:focus,
.collections-action-btn.flush-header-btn:focus-visible,
.collections-action-btn.flush-header-btn:focus-within {
  outline: none !important;
  box-shadow:
    0 4px 12px rgba(220, 38, 38, 0.25),
    0 2px 6px rgba(220, 38, 38, 0.2),
    0 1px 3px rgba(220, 38, 38, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1) !important;
  border: none !important;
}

.collections-action-btn.flush-header-btn :deep(.v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  width: auto !important;
  min-width: auto !important;
  position: relative !important;
  z-index: 1 !important;
}

.collections-action-btn.flush-header-btn :deep(.v-btn__prepend),
.collections-action-btn.flush-header-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Collections action buttons - 3D effect style with #043061 color */
.collections-action-btn {
  border-radius: 6px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  line-height: 32px !important;
  height: 32px !important;
  padding: 0 14px !important;
  text-transform: none !important;
  border: none !important;
  letter-spacing: normal !important;
  color: #ffffff !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  position: relative !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  gap: 0 !important;
  
  /* 3D gradient background with #043061 */
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  
  /* Multi-layer 3D shadow effect - raised appearance */
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  
  /* Slight 3D transform */
  transform: perspective(1000px) translateZ(0) !important;
}

.collections-action-btn::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  border-radius: 6px !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%) !important;
  pointer-events: none !important;
  opacity: 1 !important;
  transition: opacity 0.3s ease !important;
}

.collections-action-btn:hover {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
  color: #ffffff !important;
}

.collections-action-btn:hover::before {
  opacity: 1 !important;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%) !important;
}

.collections-action-btn:hover :deep(.v-btn__content) {
  text-decoration: underline !important;
}

.collections-action-btn:active {
  background: linear-gradient(135deg, #032a4f 0%, #021d3a 50%, #011528 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow: 
    0 2px 4px rgba(4, 48, 97, 0.4),
    0 1px 2px rgba(4, 48, 97, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.collections-action-btn:active::before {
  opacity: 0.5 !important;
}

.collections-action-btn :deep(.v-btn__content) {
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Remove all icon spaces and prepend/append slots */
.collections-action-btn:not(.refresh-header-btn) :deep(.v-icon),
.collections-action-btn:not(.refresh-header-btn) :deep(.v-btn__prepend),
.collections-action-btn:not(.refresh-header-btn) :deep(.v-btn__append),
.collections-action-btn:not(.refresh-header-btn) :deep(.v-btn__prepend-inner),
.collections-action-btn:not(.refresh-header-btn) :deep(.v-btn__append-inner) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Allow prepend icon for refresh button - must be more specific */
.collections-action-btn.refresh-header-btn :deep(.v-btn__prepend),
.collections-action-btn.refresh-header-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  margin-right: 6px !important;
}

.collections-action-btn.refresh-header-btn :deep(.v-icon),
.collections-action-btn.refresh-header-btn :deep(.v-btn__prepend .v-icon),
.collections-action-btn.refresh-header-btn :deep(.v-btn__prepend-inner .v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 0 !important;
  width: auto !important;
  min-width: auto !important;
}

/* Remove any spacing from prepend/append slots */
.collections-action-btn :deep(.v-btn__prepend) ~ .v-btn__content,
.collections-action-btn :deep(.v-btn__append) ~ .v-btn__content {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.collections-action-btn :deep(.v-btn__overlay) {
  display: none !important;
}

/* Refresh button - always consistent appearance with underline on hover */
.refresh-btn {
  position: relative !important;
}

.refresh-btn :deep(.v-btn__content) {
  text-decoration: none !important;
  transition: text-decoration 0.2s ease !important;
}

.refresh-btn:hover :deep(.v-btn__content) {
  text-decoration: underline !important;
}

.refresh-btn:disabled {
  opacity: 1 !important;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  color: #ffffff !important;
  cursor: not-allowed !important;
}

.refresh-btn:disabled :deep(.v-btn__content) {
  color: #ffffff !important;
  opacity: 0.7 !important;
}

.refresh-btn:disabled:hover :deep(.v-btn__content) {
  text-decoration: underline !important;
  opacity: 0.8 !important;
}

/* Prevent Vuetify from changing button appearance during loading */
.refresh-btn :deep(.v-progress-circular),
.refresh-btn :deep(.v-btn__loader) {
  display: none !important;
}

/* Ensure button wrapper has no extra spacing */
.collections-action-btn :deep(.v-btn__wrapper) {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Dashboard Content */
.dashboard-content {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 28px 24px;
}

.content-inner {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
}

@media (min-width: 769px) {
  .content-inner {
    max-width: 100%;
    margin: 0;
  }
}

.dashboard-content :deep(.v-row) {
  margin-bottom: 0 !important;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.dashboard-content :deep(.v-col) {
  display: flex;
  margin-bottom: 0;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.detail-grid-row {
  margin: 0 0 40px !important;
}

.detail-grid-row + .detail-grid-row {
  margin-top: 20px !important;
}

.detail-grid-row :deep(.v-col) {
  padding-bottom: 0 !important;
}

.detail-grid-row-single {
  margin-bottom: 48px !important;
}

.metrics-block {
  margin-bottom: 28px;
}

.status-card,
.metric-card {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.dashboard-six-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.critical-status-bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 28px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.critical-status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #d8e1eb;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.dashboard-view :deep(.v-card),
.dashboard-view :deep(.v-card-text),
.dashboard-view :deep(.v-table),
.dashboard-view :deep(.v-table__wrapper) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.status-dot-online {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
}

.status-dot-offline {
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.16);
}

.critical-status-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.critical-status-value {
  margin-left: auto;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.section-label {
  margin: 8px 0 14px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

/* KPI Cards - Minimal & Professional */
.dashboard-kpi-card {
  width: 100%;
  min-height: 96px;
  border-radius: 12px !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05) !important;
  border: 1px solid #d8e1eb !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
  height: 100%;
  overflow: hidden;
}

.dashboard-kpi-card:hover {
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.07) !important;
}

.dashboard-kpi-card :deep(.v-card-text) {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 18px 20px !important;
}

.kpi-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.kpi-label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.1;
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.kpi-value-large {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.1;
  margin-bottom: 4px;
  letter-spacing: -0.01em;
}

.kpi-context {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.35;
}

.kpi-trend {
  color: #0f172a;
}

.kpi-icon-minimal {
  flex-shrink: 0;
  margin-left: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #f8fafc;
}

.cpu-usage-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cpu-usage-track {
  width: 100%;
  height: 5px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.cpu-usage-fill {
  height: 100%;
  min-width: 6px;
  border-radius: inherit;
  background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 55%, #d97706 100%);
  transition: width 180ms ease;
}

.cpu-usage-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.chart-card :deep(.v-card-text) {
  min-height: 260px;
}

.stats-list {
  width: 100%;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  min-height: 36px;
}

.stats-item-first {
  padding-top: 6px;
}

.stats-item-label {
  font-size: 15px;
  color: #475569;
  font-weight: 600;
}

.stats-item-value {
  font-size: 16px;
  color: #1e293b;
  font-weight: 600;
  text-align: right;
  word-break: break-word;
}

.stats-item-link {
  display: inline-block;
  color: #0f766e;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.stats-item-link:hover,
.stats-item-link:focus-visible {
  color: #115e59;
}

/* Detail Cards */
.dashboard-detail-card {
  width: 100%;
  border-radius: 14px !important;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06) !important;
  border: 1px solid #d8e1eb !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
  height: 100%;
  overflow: hidden;
  margin-bottom: 0 !important;
}

.dashboard-detail-card :deep(.v-card-text) {
  padding-bottom: 24px !important;
}

.dashboard-detail-card:hover {
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08) !important;
}

.detail-card-header {
  min-height: 68px;
  background: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.detail-card-icon {
  font-size: 18px;
  color: #64748b;
  margin-right: 10px;
}

.detail-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  font-family: Inter, Helvetica, sans-serif;
  font-weight: 600;
}

.dashboard-detail-card :deep(.v-card-text) {
  height: 100%;
}

.dashboard-detail-card :deep(.v-table) {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
}

.dashboard-detail-card :deep(.v-table tbody tr:nth-child(even)) {
  background: #f8fafc;
}

.dashboard-detail-card :deep(.v-table td) {
  padding: 14px 18px;
  font-size: 14px;
  color: #334155;
  border-bottom-color: #e2e8f0 !important;
}

.dashboard-settings-section {
  width: 100%;
}

.dashboard-settings-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
  padding: 14px 16px;
  border: 1px solid #d8e1eb;
  border-bottom: none;
  border-radius: 14px 14px 0 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.dashboard-settings-table-wrap {
  border: 1px solid #d8e1eb;
  border-top: none;
  border-radius: 0 0 14px 14px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.96) 100%);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.dashboard-settings-table {
  background: transparent !important;
}

.dashboard-settings-table :deep(.v-table__wrapper),
.dashboard-settings-table :deep(table) {
  background: transparent !important;
}

.dashboard-settings-table :deep(tbody tr:nth-child(even)) {
  background: #f8fafc;
}

.dashboard-module-chip-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.dashboard-module-chip {
  max-width: 100%;
}

.dashboard-settings-table :deep(td) {
  padding: 14px 18px;
  font-size: 14px;
  color: #334155;
  border-bottom-color: #e2e8f0 !important;
}


/* Loading Card */
.loading-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
}

/* Error State - Similar to 404 view */
.error-state-wrap {
  min-height: calc(100vh - 300px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background: transparent !important;
  overflow-x: hidden;
  overflow-y: visible;
  position: relative;
  width: 100%;
  margin: 0;
}

/* Decorative background shapes */
.error-state-wrap .bg-shape {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  will-change: transform, opacity;
  transform-origin: center center;
}

.error-state-wrap .bg-triangle {
  width: 0;
  height: 0;
  opacity: 0.12;
  filter: drop-shadow(0 12px 20px rgba(0,0,0,.12)) drop-shadow(0 4px 8px rgba(0,0,0,.08));
}

.error-state-wrap .bg-circle {
  width: 150px;
  height: 150px;
  opacity: 0.15;
  border-radius: 50%;
  box-shadow: 0 15px 30px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.3);
}

.error-state-wrap .bg-hexagon {
  width: 140px;
  height: 140px;
  transform: rotate(15deg);
  opacity: 0.12;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  box-shadow: 0 12px 28px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.3);
}

.error-triangle {
  border-left: 35px solid transparent;
  border-right: 35px solid transparent;
  border-bottom: 60px solid #ef4444;
  top: 100px;
  right: 12%;
  opacity: 0.20;
  animation: floatMicro 14s ease-in-out infinite alternate, gentleCircle 28s ease-in-out infinite;
}

.error-circle {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  top: 250px;
  left: 3%;
  opacity: 0.22;
  animation: floatMicro 14s ease-in-out infinite alternate, gentleCircle 32s ease-in-out infinite reverse;
}

.error-hexagon {
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
  top: 120px;
  right: 1%;
  opacity: 0.18;
  animation: floatMicro 14s ease-in-out infinite alternate, gentleCircle 30s ease-in-out infinite;
}

@keyframes floatMicro {
  0%   { transform: translate3d(0, 0px, 0); }
  100% { transform: translate3d(0, 4px, 0); }
}

@keyframes gentleCircle {
  0% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(6px, -6px);
  }
  50% {
    transform: translate(0, -8px);
  }
  75% {
    transform: translate(-6px, -6px);
  }
  100% {
    transform: translate(0, 0);
  }
}

.error-card {
  max-width: 560px;
  width: 100%;
  background: #ffffff !important;
  border: 1px solid rgba(0, 0, 0, 0.05) !important;
  border-radius: 16px !important;
  padding: 48px !important;
  text-align: center;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.08),
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.03) !important;
  position: relative;
  z-index: 3;
}

.error-icon {
  margin-bottom: 16px !important;
}

.error-card h1 {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  color: #0a2540;
}

.error-card p {
  color: #6b7280;
  margin: 0 0 24px;
  font-size: 16px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.retry-btn {
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em !important;
  border-radius: 10px !important;
}

@media (max-width: 600px) {
  .error-card {
    padding: 32px 24px !important;
  }
  
  .error-card h1 {
    font-size: 1.5rem;
  }
  
  .error-card p {
    font-size: 14px;
  }
}

/* Unified Header Styles */
.collections-header {
  margin-top: 0 !important;
  margin-bottom: 24px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  visibility: visible !important;
  opacity: 1 !important;
  flex-wrap: wrap;
  gap: 16px;
  /* Ensure browser context menu works on right-click */
  -webkit-user-select: auto;
  -moz-user-select: auto;
  user-select: auto;
  padding-bottom: 4px !important;
}

.collections-title-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.collections-title-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 700 !important;
  font-size: 18px !important;
  line-height: 1.2 !important;
  color: #1e293b !important;
  letter-spacing: -0.02em !important;
  margin: 0 !important;
  padding: 0 !important;
}

.collections-header-actions {
  display: flex !important;
  gap: 12px !important;
  align-items: center !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

@media (max-width: 960px) {
  .dashboard-view {
    padding: 0;
    border-radius: 0;
  }

  .critical-status-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-six-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .dashboard-view {
    padding: 0;
    border-radius: 0;
  }

  .collections-header {
    align-items: stretch !important;
  }

  .collections-header-actions {
    width: 100%;
    flex-direction: column !important;
    align-items: stretch !important;
  }

  .collections-action-btn {
    flex: 1 1 0;
    width: 100% !important;
    justify-content: flex-start !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  .collections-action-btn :deep(.v-btn__content) {
    width: 100% !important;
    justify-content: flex-start !important;
    text-align: left !important;
  }

  .collections-action-btn.refresh-header-btn :deep(.v-btn__prepend),
  .collections-action-btn.refresh-header-btn :deep(.v-btn__prepend-inner),
  .collections-action-btn.flush-header-btn :deep(.v-btn__prepend),
  .collections-action-btn.flush-header-btn :deep(.v-btn__prepend-inner) {
    margin-right: 10px !important;
    margin-left: 0 !important;
  }

  .collections-action-btn.refresh-header-btn :deep(.v-icon),
  .collections-action-btn.flush-header-btn :deep(.v-icon) {
    margin-right: 0 !important;
    margin-left: 0 !important;
  }

  .collections-action-btn.flush-header-btn :deep(.v-btn__content),
  .collections-action-btn.flush-header-btn :deep(.v-btn__content span),
  .collections-action-btn.refresh-header-btn :deep(.v-btn__content),
  .collections-action-btn.refresh-header-btn :deep(.v-btn__content span) {
    justify-content: flex-start !important;
    text-align: left !important;
  }

  .stats-item {
    align-items: flex-start;
  }

  .critical-status-bar {
    grid-template-columns: 1fr;
  }

  .critical-status-item {
    min-height: 48px;
  }

  .dashboard-six-grid {
    grid-template-columns: 1fr;
  }
}

.collections-action-btn {
  border-radius: 6px !important;
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  line-height: 32px !important;
  height: 32px !important;
  padding: 0 14px !important;
  text-transform: none !important;
  border: none !important;
  letter-spacing: normal !important;
  color: #ffffff !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  position: relative !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  gap: 0 !important;
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
}

.collections-action-btn:hover {
  background: linear-gradient(135deg, #043061 0%, #032a4f 50%, #021d3a 100%) !important;
  box-shadow: 
    0 4px 8px rgba(4, 48, 97, 0.4),
    0 2px 4px rgba(4, 48, 97, 0.3),
    0 1px 2px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
  transform: perspective(1000px) translateZ(0) !important;
  color: #ffffff !important;
}

.collections-action-btn:hover :deep(.v-btn__content) {
  text-decoration: underline !important;
}

.collections-action-btn:active {
  background: linear-gradient(135deg, #032a4f 0%, #021d3a 50%, #011528 100%) !important;
  transform: perspective(1000px) translateY(0) translateZ(0) !important;
  box-shadow: 
    0 2px 4px rgba(4, 48, 97, 0.4),
    0 1px 2px rgba(4, 48, 97, 0.3),
    0 1px 1px rgba(0, 0, 0, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

.collections-action-btn :deep(.v-btn__content) {
  color: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.collections-action-btn :deep(.v-icon),
.collections-action-btn :deep(.v-btn__prepend),
.collections-action-btn :deep(.v-btn__append) {
  display: none !important;
}

/* Allow prepend icon for flush button - align left */
.collections-action-btn.flush-header-btn :deep(.v-btn__prepend),
.collections-action-btn.flush-header-btn :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  width: auto !important;
  min-width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  margin-right: 8px !important;
  order: 1 !important;
}

.collections-action-btn.flush-header-btn :deep(.v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 8px !important;
  width: auto !important;
  min-width: auto !important;
  order: 1 !important;
}

/* Flush button content - align left with icon first */
.collections-action-btn.flush-header-btn :deep(.v-btn__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-direction: row !important;
  text-align: center !important;
  gap: 8px !important;
  position: relative !important;
  z-index: 1 !important;
  color: #ffffff !important;
}

/* Icon comes first (leftmost) */
.collections-action-btn.flush-header-btn :deep(.v-btn__prepend),
.collections-action-btn.flush-header-btn :deep(.v-btn__prepend-inner) {
  order: -1 !important;
  margin-right: 8px !important;
  margin-left: 0 !important;
}

.collections-action-btn.flush-header-btn :deep(.v-icon) {
  order: -1 !important;
  margin-right: 8px !important;
  margin-left: 0 !important;
}

/* Text comes after icon */
.collections-action-btn.flush-header-btn :deep(.v-btn__content span) {
  order: 0 !important;
  text-align: center !important;
  margin-left: 0 !important;
  flex-shrink: 0 !important;
}

/* Remove any blue glow/ripple effects from dashboard button */
.collections-action-btn.flush-header-btn :deep(.v-btn__overlay) {
  display: none !important;
}

.collections-action-btn.flush-header-btn :deep(.v-ripple__container) {
  display: none !important;
}

/* Search Settings Boxes */
.search-setting-box {
  height: 100%;
  border-radius: 8px !important;
  transition: box-shadow 0.2s ease !important;
}

.search-setting-box:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.search-setting-title {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #1e293b !important;
  padding: 12px 16px !important;
  border-bottom: 1px solid #e2e8f0 !important;
  background: #f8fafc !important;
  display: flex !important;
  align-items: center !important;
}

.search-setting-content {
  padding: 16px !important;
}

.search-setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
}

.search-setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  flex: 1;
}

.setting-value {
  font-size: 13px;
  color: #1e293b;
  font-weight: 600;
  text-align: right;
}

/* Flush Data Dialog - Same styling as Delete Collection Dialog */
.flush-data-dialog :deep(.v-overlay__content) {
  border-radius: 16px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: none !important;
}

.flush-data-dialog :deep(.v-card) {
  border: none !important;
}

.flush-data-dialog :deep(.v-card-title),
.flush-data-dialog :deep(.v-card-text),
.flush-data-dialog :deep(.v-card-actions) {
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: none !important;
  outline: none !important;
}

.flush-data-dialog :deep(.v-card)::before,
.flush-data-dialog :deep(.v-card)::after {
  display: none !important;
}

.flush-data-dialog :deep(.v-overlay__scrim) {
  background: rgba(0, 0, 0, 0.5) !important;
}

.flush-dialog-card {
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid #e2e8f0 !important;
}

.flush-dialog-header {
  background: #dc2626 !important;
  padding: 20px 24px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 16px !important;
  border-bottom: none !important;
  border: none !important;
}

.flush-dialog-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.flush-dialog-icon {
  color: #ffffff !important;
}

.flush-dialog-title-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  text-align: left;
}

.flush-dialog-title {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 20px !important;
  line-height: 1.3 !important;
  color: #ffffff !important;
  letter-spacing: -0.01em !important;
  text-align: left !important;
}

.flush-dialog-subtitle {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 14px !important;
  line-height: 1.4 !important;
  color: rgba(255, 255, 255, 0.9) !important;
  text-align: left !important;
}

.flush-dialog-content {
  padding: 24px !important;
  background: #ffffff !important;
}

.flush-warning-text {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 400 !important;
  font-size: 15px !important;
  line-height: 1.6 !important;
  color: #1e293b !important;
  margin-bottom: 20px;
}

.flush-data-info-card {
  background: #f8fafc !important;
  border: none !important;
  border-radius: 12px !important;
  padding: 20px !important;
  margin-bottom: 0 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
}

.flush-info-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.flush-info-label {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 500 !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  color: #64748b !important;
  display: flex;
  align-items: center;
}

.flush-info-value {
  font-family: Inter, Helvetica, sans-serif !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #1e293b !important;
}

.flush-error-alert {
  border-radius: 8px !important;
}

.flush-error-title {
  font-weight: 600 !important;
  font-size: 14px !important;
  margin-bottom: 4px;
  color: #dc2626 !important;
}

.flush-error-message {
  font-size: 13px !important;
  color: #991b1b !important;
  margin-bottom: 4px;
}

.flush-error-help {
  font-size: 12px !important;
  color: #7f1d1d !important;
  opacity: 0.8;
}

.flush-dialog-actions {
  padding: 16px 24px !important;
  background: #ffffff !important;
  border-top: 1px solid #e2e8f0 !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
}

.flush-btn-left {
  min-width: 140px !important;
  background: #850f0f !important;
  background-color: #850f0f !important;
}

/* Flush button in popup - solid red like header with left-aligned icon and text */
.flush-btn-left.unified-btn-danger {
  background: #dc2626 !important;
  background-color: #dc2626 !important;
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2) !important;
  outline: none !important;
  border: none !important;
}

.flush-btn-left.unified-btn-danger:hover {
  background: #b91c1c !important;
  background-color: #b91c1c !important;
  color: #ffffff !important;
  box-shadow: 0 3px 6px rgba(220, 38, 38, 0.25) !important;
  outline: none !important;
}

.flush-btn-left.unified-btn-danger:active {
  background: #991b1b !important;
  background-color: #991b1b !important;
  color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2) !important;
  outline: none !important;
}

.flush-btn-left.unified-btn-danger:focus,
.flush-btn-left.unified-btn-danger:focus-visible,
.flush-btn-left.unified-btn-danger:focus-within {
  outline: none !important;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2) !important;
  border: none !important;
}

/* Flush button content - left align icon and text */
.flush-btn-left :deep(.v-btn__content) {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 6px !important;
  text-align: left !important;
  flex-direction: row !important;
}

/* Icon comes first (leftmost) */
.flush-btn-left :deep(.v-btn__prepend),
.flush-btn-left :deep(.v-btn__prepend-inner) {
  display: flex !important;
  align-items: center !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
  padding: 0 !important;
  order: -1 !important;
  float: none !important;
}

.flush-btn-left :deep(.v-icon) {
  display: inline-flex !important;
  color: #ffffff !important;
  opacity: 1 !important;
  font-size: 18px !important;
  margin-right: 0 !important;
  margin-left: 0 !important;
  padding: 0 !important;
  order: -1 !important;
  float: none !important;
}

/* Text comes after icon */
.flush-btn-left :deep(.v-btn__content span) {
  order: 0 !important;
  text-align: left !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  flex-shrink: 0 !important;
}

/* Remove any blue glow/ripple effects */
.flush-btn-left :deep(.v-btn__overlay) {
  display: none !important;
}

.flush-btn-left :deep(.v-ripple__container) {
  display: none !important;
}

@media (max-width: 768px) {
  .dashboard-view {
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    left: auto !important;
    right: auto !important;
  }

  .dashboard-view .collections-header,
  .dashboard-view .collections-title-section,
  .dashboard-view .content-inner,
  .dashboard-view .dashboard-content,
  .dashboard-view .dashboard-six-grid,
  .dashboard-view .critical-status-bar,
  .dashboard-view .detail-grid-row,
  .dashboard-view .detail-grid-row-single {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .dashboard-view .dashboard-content {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 26px 18px 40px 18px !important;
  }

  .dashboard-view .content-inner {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .dashboard-view .collections-header {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    margin-bottom: 14px !important;
    gap: 0 !important;
    padding-bottom: 0 !important;
  }

  .dashboard-view .collections-title-section {
    display: block !important;
    flex: 0 0 auto !important;
    width: 100% !important;
    margin: 0 !important;
  }

  .dashboard-view .dashboard-title,
  .dashboard-view .collections-title-text.dashboard-title {
    margin: 0 0 22px 0 !important;
    font-size: 30px !important;
    line-height: 1.15 !important;
  }

  .dashboard-view .dashboard-actions {
    position: static !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    transform: none !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    align-items: stretch !important;
    margin-top: 0 !important;
    margin-bottom: 34px !important;
    padding: 0 !important;
    z-index: auto !important;
  }

  .dashboard-view .critical-status-bar,
  .dashboard-view .status-grid,
  .dashboard-view .dashboard-six-grid {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 14px !important;
  }

  .dashboard-view .status-grid {
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
    margin-bottom: 24px !important;
  }

  .dashboard-view .detail-grid-row,
  .dashboard-view .detail-grid-row-single {
    margin: 0 0 28px !important;
  }

  .dashboard-view .dashboard-actions .action-button {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 52px !important;
    min-height: 52px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: relative !important;
    box-sizing: border-box !important;
    padding: 0 !important;
    border-radius: 12px !important;
    font-size: 17px !important;
    font-weight: 600 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    transform: none !important;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12) !important;
    flex: 0 0 auto !important;
  }

  .dashboard-view .dashboard-actions .action-button :deep(.v-btn__content) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 0 !important;
    text-align: center !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    position: relative !important;
  }

  .dashboard-view .dashboard-actions .action-button :deep(.v-btn__prepend),
  .dashboard-view .dashboard-actions .action-button :deep(.v-btn__prepend-inner),
  .dashboard-view .dashboard-actions .action-button :deep(.v-icon),
  .dashboard-view .dashboard-actions .action-button :deep(svg) {
    position: absolute !important;
    left: 18px !important;
    margin: 0 !important;
    font-size: 20px !important;
  }

  .dashboard-view .dashboard-actions .dashboard-header-btn-label,
  .dashboard-view .dashboard-actions .action-button :deep(.v-btn__content span) {
    display: block !important;
    width: fit-content !important;
    min-width: 0 !important;
    margin: 0 auto !important;
    text-align: center !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: clip !important;
    line-height: 1.2 !important;
  }

  .dashboard-view .flush-header-btn {
    box-shadow: 0 8px 16px rgba(180, 0, 0, 0.16) !important;
  }

  .dashboard-view .status-card,
  .dashboard-view .metric-card,
  .dashboard-view .dashboard-settings-section {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    border-radius: 14px !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .dashboard-view .status-card {
    height: auto !important;
    min-height: 56px !important;
  }

  .dashboard-view .section-title,
  .dashboard-view .section-label.section-title {
    margin: 0 0 18px !important;
  }

  .dashboard-view .metric-card {
    border-radius: 16px !important;
    margin-bottom: 22px !important;
  }

  .dashboard-view .metric-card :deep(.v-card-text) {
    padding: 28px 24px !important;
  }

  .dashboard-view .metrics-section {
    width: 100% !important;
    margin-bottom: 14px !important;
  }

  .dashboard-view :deep(.v-row),
  .dashboard-view :deep(.v-col),
  .dashboard-view :deep(.v-card),
  .dashboard-view :deep(.v-card-text),
  .dashboard-view :deep(.v-table),
  .dashboard-view :deep(.v-table__wrapper) {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }

  .dashboard-view :deep(.v-row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .dashboard-view :deep(.v-col) {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}
</style>
