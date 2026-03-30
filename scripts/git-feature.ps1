param(
  [Parameter(Position = 0)]
  [string]$BranchName
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendRoot = Split-Path -Parent $scriptDir
$backendRoot = Join-Path (Split-Path -Parent $frontendRoot) "Audit-Service"

if ([string]::IsNullOrWhiteSpace($BranchName)) {
  Write-Error "Usage: npm run git:feature -- <branch-name>"
  exit 1
}

$trimmedBranchName = $BranchName.Trim()

if ($trimmedBranchName.StartsWith("feature/")) {
  $trimmedBranchName = $trimmedBranchName.Substring(8)
}

if ([string]::IsNullOrWhiteSpace($trimmedBranchName)) {
  Write-Error "Branch name cannot be empty."
  exit 1
}

$sharedBranchName = "feature/$trimmedBranchName"

function Invoke-Git {
  param(
    [string]$RepositoryRoot,
    [string[]]$Arguments
  )

  Push-Location $RepositoryRoot

  try {
    & git @Arguments

    if ($LASTEXITCODE -ne 0) {
      throw "git $($Arguments -join ' ') failed in $RepositoryRoot"
    }
  }
  finally {
    Pop-Location
  }
}

function Assert-CleanWorkingTree {
  param(
    [string]$RepositoryRoot,
    [string]$RepositoryLabel
  )

  Push-Location $RepositoryRoot

  try {
    $statusOutput = git status --porcelain

    if ($LASTEXITCODE -ne 0) {
      throw "Unable to read git status for $RepositoryLabel"
    }

    if (-not [string]::IsNullOrWhiteSpace(($statusOutput | Out-String).Trim())) {
      throw "$RepositoryLabel has uncommitted changes. Commit or stash them before creating shared feature branches."
    }
  }
  finally {
    Pop-Location
  }
}

function Assert-BranchMissing {
  param(
    [string]$RepositoryRoot,
    [string]$RepositoryLabel,
    [string]$Name
  )

  Push-Location $RepositoryRoot

  try {
    & git show-ref --verify --quiet "refs/heads/$Name"

    if ($LASTEXITCODE -eq 0) {
      throw "$RepositoryLabel already has a local branch named $Name"
    }

    & git show-ref --verify --quiet "refs/remotes/origin/$Name"

    if ($LASTEXITCODE -eq 0) {
      throw "$RepositoryLabel already has a remote branch named origin/$Name"
    }
  }
  finally {
    Pop-Location
  }
}

function New-FeatureBranch {
  param(
    [string]$RepositoryRoot,
    [string]$RepositoryLabel,
    [string]$Name
  )

  Assert-CleanWorkingTree -RepositoryRoot $RepositoryRoot -RepositoryLabel $RepositoryLabel
  Invoke-Git -RepositoryRoot $RepositoryRoot -Arguments @('fetch', 'origin', 'develop')

  Push-Location $RepositoryRoot

  try {
    & git show-ref --verify --quiet 'refs/remotes/origin/develop'

    if ($LASTEXITCODE -ne 0) {
      throw "$RepositoryLabel does not have origin/develop"
    }
  }
  finally {
    Pop-Location
  }

  Assert-BranchMissing -RepositoryRoot $RepositoryRoot -RepositoryLabel $RepositoryLabel -Name $Name
  Invoke-Git -RepositoryRoot $RepositoryRoot -Arguments @('switch', '-c', $Name, '--track', 'origin/develop')
}

New-FeatureBranch -RepositoryRoot $frontendRoot -RepositoryLabel 'Frontend' -Name $sharedBranchName
New-FeatureBranch -RepositoryRoot $backendRoot -RepositoryLabel 'Backend' -Name $sharedBranchName

Write-Host "Created and checked out $sharedBranchName in both repositories."