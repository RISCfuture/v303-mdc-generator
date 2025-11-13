<script setup lang="ts">
import { NCard, NSpace, NText, NIcon } from 'naive-ui'
import { LogoGithub, ChevronBackOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'

const router = useRouter()

const baseGitHubUrl = 'https://github.com/RISCfuture/v303-mdc-generator/blob/main/src/data/json'

interface DataFile {
  name: string
  path: string
  description: string
  note?: string
}

interface DataCategory {
  title: string
  files: DataFile[]
}

const dataCategories: DataCategory[] = [
  {
    title: 'Squadron Configuration',
    files: [
      {
        name: 'squadrons.json',
        path: 'squadrons.json',
        description: 'Squadron IDs, names, and aircraft types',
      },
      {
        name: 'crew.json',
        path: 'crew.json',
        description: 'Pilot names, call signs, and code assignments',
      },
      {
        name: 'loadouts.json',
        path: 'loadouts.json',
        description: 'Standard conventional loads (SCLs)',
      },
    ],
  },
  {
    title: 'Theater Data',
    files: [
      {
        name: 'theaters.json',
        path: 'theaters.json',
        description:
          'Theater names, IFG (In-Flight Guide) URLs, default airbases, default support assets',
      },
      {
        name: 'channelization/',
        path: 'channelization',
        description: 'Radio preset configurations by theater and aircraft',
      },
    ],
  },
  {
    title: 'DTC Configurations',
    files: [
      {
        name: 'dtc/v93.json',
        path: 'dtc/v93.json',
        description: 'Default F-16C DTC for v93 FS',
        note: 'Should be exported from DCS-DTC, not edited directly',
      },
      {
        name: 'dtc/v303.json',
        path: 'dtc/v303.json',
        description: 'Default A-10C DTC for v303 FS',
        note: 'Should be exported from JAFDTC, not edited directly',
      },
    ],
  },
  {
    title: 'Data Overrides',
    files: [
      {
        name: 'munitions-overrides.json',
        path: 'munitions-overrides.json',
        description: 'Override munition properties (shortName, weight, category, etc.)',
        note: 'Use this to customize auto-generated munition data',
      },
      {
        name: 'airframe-overrides/',
        path: 'airframe-overrides',
        description: 'Override aircraft properties by airframe',
        note: 'Customize radio names, station names, and other aircraft-specific data',
      },
    ],
  },
]

function goBack() {
  router.back()
}
</script>

<template>
  <div class="squadron-data-edit">
    <NCard>
      <template #header>
        <div class="card-header">
          <NIcon :size="24" class="back-chevron" @click="goBack">
            <ChevronBackOutline />
          </NIcon>
          <span class="card-title">Edit Squadron Data</span>
        </div>
      </template>

      <NSpace vertical :size="24">
        <NSpace vertical>
          <p class="intro-text">
            The squadron data used by this application is stored in JSON files in the project
            repository. You can update squadron information by editing these files and submitting a
            pull request on GitHub.
          </p>
          <p class="intro-text">
            Click on any file below to open it on GitHub and begin editing. Auto-generated files
            (munitions, airframes, navaids, and airfields) are not included in this list. Override
            files (munitions-overrides, airframe-overrides) are editable and can be used to
            customize generated data.
          </p>
        </NSpace>

        <NSpace v-for="category in dataCategories" :key="category.title" vertical>
          <h3 class="category-title">{{ category.title }}</h3>

          <NSpace vertical :size="12" class="file-list">
            <a
              v-for="file in category.files"
              :key="file.path"
              :href="`${baseGitHubUrl}/${file.path}`"
              target="_blank"
              rel="noopener noreferrer"
              class="file-link"
            >
              <NSpace vertical :size="8">
                <NSpace :size="8" align="center">
                  <NIcon :size="18" class="github-icon">
                    <LogoGithub />
                  </NIcon>
                  <span class="file-name">{{ file.name }}</span>
                </NSpace>
                <p class="file-description">{{ file.description }}</p>
                <div v-if="file.note" class="file-note"><strong>Note:</strong> {{ file.note }}</div>
              </NSpace>
            </a>
          </NSpace>
        </NSpace>

        <div class="help-section">
          <NText depth="3">
            For more information, check the
            <a
              href="https://github.com/RISCfuture/v303-mdc-generator"
              target="_blank"
              rel="noopener noreferrer"
              >project repository</a
            >
            for documentation.
          </NText>
        </div>
      </NSpace>
    </NCard>
  </div>
</template>

<style scoped>
.squadron-data-edit {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-chevron {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.back-chevron:hover {
  opacity: 0.7;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
}

.intro-text {
  line-height: 1.6;
}

.category-title {
  font-size: 18px;
  font-weight: 600;
}

.file-list {
  width: 100%;
}

.file-link {
  display: block;
  padding: 16px;
  background-color: rgb(255 255 255 / 3%);
  border: 1px solid rgb(255 255 255 / 9%);
  border-radius: 6px;
  color: inherit;
  text-decoration: none;
  transition: all 0.2s ease;
  width: 100%;
}

.file-link:hover {
  background-color: rgb(255 255 255 / 6%);
  border-color: rgb(24 160 88 / 60%);
  transform: translateY(-1px);
}

.github-icon {
  color: rgb(24 160 88);
}

.file-name {
  font-weight: 600;
  font-size: 15px;
  font-family: 'Courier New', monospace;
}

.file-description {
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.8;
}

.file-note {
  padding: 8px 12px;
  background-color: rgb(250 173 20 / 10%);
  border-left: 3px solid #faad14;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
}

.help-section {
  padding-top: 24px;
  border-top: 1px solid rgb(255 255 255 / 9%);
  text-align: center;
}

.help-section a {
  color: rgb(24 160 88);
  text-decoration: none;
}

.help-section a:hover {
  text-decoration: underline;
}
</style>
