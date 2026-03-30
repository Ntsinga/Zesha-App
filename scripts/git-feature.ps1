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

function Get-DevelopBranchName {
  param(
    [string]$RepositoryRoot
  )

  Push-Location $RepositoryRoot

  try {
    $developBranch = git config --get gitflow.branch.develop

    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($developBranch)) {
      return 'develop'
    }

    return $developBranch.Trim()
  }
  finally {
    Pop-Location
  }
}

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

function Assert-LocalBranchExists {
  param(
    [string]$RepositoryRoot,
    [string]$RepositoryLabel,
    [string]$Name
  )

  Push-Location $RepositoryRoot

  try {
    & git show-ref --verify --quiet "refs/heads/$Name"

    if ($LASTEXITCODE -ne 0) {
      throw "$RepositoryLabel does not have a local branch named $Name. Create it first or run git flow init with that develop branch."
    }
  }
  finally {
    Pop-Location
  }
}

function Assert-RemoteBranchExists {
  param(
    [string]$RepositoryRoot,
    [string]$RepositoryLabel,
    [string]$Name
  )

  Push-Location $RepositoryRoot

  try {
    & git show-ref --verify --quiet "refs/remotes/origin/$Name"

    if ($LASTEXITCODE -ne 0) {
      throw "$RepositoryLabel does not have a remote branch named origin/$Name."
    }
  }
  finally {
    Pop-Location
  }
}

function Test-FeatureBranchCreation {
  param(
    [string]$RepositoryRoot,
    [string]$RepositoryLabel,
    [string]$Name
  )

  $developBranch = Get-DevelopBranchName -RepositoryRoot $RepositoryRoot

  Assert-CleanWorkingTree -RepositoryRoot $RepositoryRoot -RepositoryLabel $RepositoryLabel
  Assert-LocalBranchExists -RepositoryRoot $RepositoryRoot -RepositoryLabel $RepositoryLabel -Name $developBranch
  Assert-RemoteBranchExists -RepositoryRoot $RepositoryRoot -RepositoryLabel $RepositoryLabel -Name $developBranch
  Assert-BranchMissing -RepositoryRoot $RepositoryRoot -RepositoryLabel $RepositoryLabel -Name $Name

  return $developBranch
}

function Update-DevelopBranch {
  param(
    [string]$RepositoryRoot,
    [string]$DevelopBranch
  )

  Invoke-Git -RepositoryRoot $RepositoryRoot -Arguments @('switch', $DevelopBranch)
  Invoke-Git -RepositoryRoot $RepositoryRoot -Arguments @('pull', '--ff-only', 'origin', $DevelopBranch)
}

function New-FeatureBranch {
  param(
    [string]$RepositoryRoot,
    [string]$RepositoryLabel,
    [string]$Name,
    [string]$DevelopBranch
  )

  Update-DevelopBranch -RepositoryRoot $RepositoryRoot -DevelopBranch $DevelopBranch
  Invoke-Git -RepositoryRoot $RepositoryRoot -Arguments @('switch', '-c', $Name)
}

$frontendDevelopBranch = Test-FeatureBranchCreation -RepositoryRoot $frontendRoot -RepositoryLabel 'Frontend' -Name $sharedBranchName
$backendDevelopBranch = Test-FeatureBranchCreation -RepositoryRoot $backendRoot -RepositoryLabel 'Backend' -Name $sharedBranchName

New-FeatureBranch -RepositoryRoot $frontendRoot -RepositoryLabel 'Frontend' -Name $sharedBranchName -DevelopBranch $frontendDevelopBranch
New-FeatureBranch -RepositoryRoot $backendRoot -RepositoryLabel 'Backend' -Name $sharedBranchName -DevelopBranch $backendDevelopBranch

Write-Host "Created and checked out $sharedBranchName in both repositories."