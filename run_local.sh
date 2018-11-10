#!/usr/bin/env bash

trap cleanup 2
set -e



#------------
# FunctionsBuilder
#------------







#------------
# CleanupBuilder
#------------


cleanup()
{
  echo "****************************************************************"
  echo "Stopping software .....please wait...."
  echo "****************************************************************"

  ALL_COMPONENTS=(redis node)
  for componentToStop in "${ALL_COMPONENTS[@]}"; do
    IFS=',' read -r -a keepRunningArray <<< "$KEEP_RUNNING"
    componentFoundToKeepRunning=0
    for keepRunningToFindeElement in "${keepRunningArray[@]}"; do
      if [ "$componentToStop" == "$keepRunningToFindeElement" ]; then
        echo "Not stopping $componentToStop!"
        componentFoundToKeepRunning=1
      fi
    done
    if [ "$componentFoundToKeepRunning" -eq 0 ]; then
      
      if [ "$componentToStop" == "redis" ]; then
        echo "Stopping $componentToStop ..."
        
        if [ "$TYPE_SOURCE_REDIS" == "docker" ]; then
         docker rm -f $dockerContainerIDredis
         rm -f .redisPid
        fi
        
      fi
      
      if [ "$componentToStop" == "node" ]; then
        echo "Stopping $componentToStop ..."
        
        if [ "$TYPE_SOURCE_PHS" == "docker" ]; then
         docker rm -f $dockerContainerIDphs
         rm -f .phsPid
        fi
        
        if [ "$TYPE_SOURCE_PHS" == "local" ]; then
         ps -p $processIdphs >/dev/null && kill $processIdphs
         rm -f .phsPid
        fi
        
      fi
      
    fi
  done

  exit 0
}







#------------
# OptionsBuilder
#------------


usage="$(basename "$0") - Builds, deploys and run ${name}
where:
  -h                         show this help text
  -s                         skip any build
  -c [all|build]             clean local run directory, when a build is scheduled for execution it also does a full build
  -k [component]             keep comma sperarated list of components running
  -t [component:type:[path|version]] run component inside [docker] container, [download] component (default) or [local] use installed component from path
  -V                         enable Verbose
  -v                         start VirtualBox via vagrant, install all dependencies, ssh into the VM and run
  -f                         tail the nodejs log at the end
  

Details:
 -t redis:local #reuse a local, running Redis installation, does not start/stop this Redis
 -t redis:docker:[3|4] #start docker image redis:X
 -t phs:local #reuse a local node installation
 -t phs:docker:[6|8|10] #start docker image node:X

"

cd "$(cd "$(dirname "$0")";pwd -P)"
BASE_PWD=$(pwd)

BUILD=local
while getopts ':hsc:k:t:Vvf' option; do
  case "$option" in
    h) echo "$usage"
       exit;;
    s) SKIP_BUILD=YES;;
    c) 
       CLEAN=$OPTARG
       if [ "$CLEAN" != "all" -a "$CLEAN" != "build" ]; then
         echo "Illegal -c parameter" && exit 1
       fi
       ;;
    k) KEEP_RUNNING=$OPTARG;;
    t) TYPE_SOURCE=$OPTARG;;
    V) VERBOSE=YES;;

    v) VAGRANT=YES;;

    f) TAIL=YES;;

    :) printf "missing argument for -%s\\n" "$OPTARG" >&2
       echo "$usage" >&2
       exit 1;;
   \\?) printf "illegal option: -%s\\n" "$OPTARG" >&2
       echo "$usage" >&2
       exit 1;;
  esac
done
shift $((OPTIND - 1))
TYPE_PARAM="$1"






#------------
# DependencycheckBuilder
#------------

docker --version 1>/dev/null || exit 1; 
node --version 1>/dev/null || exit 1; 
npm --version 1>/dev/null || exit 1; 




# clean if requested
if [ -n "$CLEAN" ]; then
  if [ "$CLEAN" == "all" ]; then
    if [ "$VERBOSE" == "YES" ]; then echo "rm -rf localrun"; fi
    rm -rf localrun
  fi
  

#------------
# CleanBuilder
#------------




fi



#------------
# GlobalVariablesBuilder
#------------


      if [ "$VERBOSE" == "YES" ]; then echo "DEFAULT: TYPE_SOURCE_REDIS=docker"; fi
      TYPE_SOURCE_REDIS=docker
    

      if [ "$VERBOSE" == "YES" ]; then echo "DEFAULT: TYPE_SOURCE_PHS=local"; fi
      TYPE_SOURCE_PHS=local
    



mkdir -p localrun



#------------
# PrepareBuilder
#------------



if [ "$VAGRANT" == "YES" -a "$VAGRANT_IGNORE" != "YES" ]; then
  mkdir -p localrun
  cd localrun
  cat <<-EOF > Vagrantfile
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/xenial64"
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.synced_folder "../", "/share_host"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
  end
  config.vm.provision "shell", inline: <<-SHELL
  	
    apt-get update    
    
      if [ "\$(cat /etc/*release|grep ^ID=)" = "ID=debian"  ]; then \\
        if [ "\$(cat /etc/debian_version)" = "8.11" ]; then \\
           curl -sL https://deb.nodesource.com/setup_6.x | bash -; apt-get -qy install nodejs docker.io; \\
        elif [ "\$(cat /etc/debian_version)" = "9.5" ]; then \\
          curl -sL https://deb.nodesource.com/setup_6.x | bash -; apt-get -qy install nodejs docker.io; \\
        else curl -sL https://deb.nodesource.com/setup_10.x | bash -; apt-get -qy install nodejs docker.io; fi \\
      elif [ "\$(cat /etc/*release|grep ^ID=)" = "ID=ubuntu"  ]; then \\
        curl -sL https://deb.nodesource.com/setup_10.x | bash -; apt-get -qy install nodejs docker.io; \\
      else \\
        echo "only debian or ubuntu are supported."; \\
        exit 1; \\
      fi \\
    
    
    
    echo "Now continue with..."
    echo "\$ cd /share_host"
    echo "\$ sudo ./run_local.sh -f"
    echo "...then browse to http://localhost:8080/XXXX"
  SHELL
end
EOF
  vagrant up
  if [ -f "../run_local.sh" ]; then
    vagrant ssh -c "cd /share_host && sudo ./run_local.sh -f"
  else
    echo "Save the fulgens output into a bash script (e.g. run_local.sh) and use it inside the new VM"
  fi
  exit 1
fi








#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# RedisPlugin // redis
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
if [ -n "$VERBOSE" ]; then echo "RedisPlugin // redis"; fi




#------------
# Plugin-PrepareComp
#------------




IFS=',' read -r -a array <<< "$TYPE_SOURCE"
for typeSourceElement in "${array[@]}"; do
  IFS=: read comp type pathOrVersion <<< "$typeSourceElement"

  if [ "$comp" == "redis" ]; then
    TYPE_SOURCE_REDIS=$type
    if [ "$TYPE_SOURCE_REDIS" == "local" ]; then
      TYPE_SOURCE_REDIS_PATH=$pathOrVersion
    else
      TYPE_SOURCE_REDIS_VERSION=$pathOrVersion
    fi
  fi

done



if [ "$TYPE_SOURCE_REDIS" == "docker" ]; then
  if [ -z "$TYPE_SOURCE_REDIS_VERSION" ]; then
    TYPE_SOURCE_REDIS_VERSION=4
  fi
    
fi



if [ "$VERBOSE" == "YES" ]; then
  echo "TYPE_SOURCE_REDIS = $TYPE_SOURCE_REDIS // TYPE_SOURCE_REDIS_PATH = $TYPE_SOURCE_REDIS_PATH // TYPE_SOURCE_REDIS_VERSION = $TYPE_SOURCE_REDIS_VERSION"
fi







#------------
# Plugin-GetSource
#------------







#------------
# Plugin-PreBuild
#------------







#------------
# Plugin-Build
#------------







#------------
# Plugin-PostBuild
#------------







#------------
# Plugin-PreStart
#------------







#------------
# Plugin-Start
#------------





if [ "$TYPE_SOURCE_REDIS" == "docker" ]; then
  # run in docker
  if [ ! -f ".redisPid" ]; then
    
    if [ "$VERBOSE" == "YES" ]; then echo "docker run --rm -d -p 6379:6379 $dockerRedisdbExtRef   redis:$TYPE_SOURCE_REDIS_VERSION"; fi
    dockerContainerIDredis=$(docker run --rm -d -p 6379:6379 $dockerRedisdbExtRef   redis:$TYPE_SOURCE_REDIS_VERSION)
    echo "$dockerContainerIDredis">.redisPid
  else
    dockerContainerIDredis=$(<.redisPid)
  fi
fi
if [ "$TYPE_SOURCE_REDIS" == "local" ]; then
  if [ -f ".redisPid" ]; then
    echo "redis redis running but started from different source type"
    exit 1
  fi
fi



#------------
# Plugin-PostStart
#------------







#------------
# Plugin-LeaveComp
#------------







#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# NodePlugin // phs
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
if [ -n "$VERBOSE" ]; then echo "NodePlugin // phs"; fi




#------------
# Plugin-PrepareComp
#------------




IFS=',' read -r -a array <<< "$TYPE_SOURCE"
for typeSourceElement in "${array[@]}"; do
  IFS=: read comp type pathOrVersion <<< "$typeSourceElement"

  if [ "$comp" == "phs" ]; then
    TYPE_SOURCE_PHS=$type
    if [ "$TYPE_SOURCE_PHS" == "local" ]; then
      TYPE_SOURCE_PHS_PATH=$pathOrVersion
    else
      TYPE_SOURCE_PHS_VERSION=$pathOrVersion
    fi
  fi

done



if [ "$TYPE_SOURCE_PHS" == "docker" ]; then
  if [ -z "$TYPE_SOURCE_PHS_VERSION" ]; then
    TYPE_SOURCE_PHS_VERSION=10
  fi
    
fi



if [ "$VERBOSE" == "YES" ]; then
  echo "TYPE_SOURCE_PHS = $TYPE_SOURCE_PHS // TYPE_SOURCE_PHS_PATH = $TYPE_SOURCE_PHS_PATH // TYPE_SOURCE_PHS_VERSION = $TYPE_SOURCE_PHS_VERSION"
fi







#------------
# Plugin-GetSource
#------------







#------------
# Plugin-PreBuild
#------------







#------------
# Plugin-Build
#------------





f_build() {
  if [ "$VERBOSE" == "YES" ]; then echo "npm i --save-prod"; fi
  
  npm i --save-prod
  
}
if [ "$SKIP_BUILD" != "YES" ]; then
  if [ -n "$CLEAN" ]; then
    if [ "$VERBOSE" == "YES" ]; then echo "rm -rf node_modules/"; fi
    rm -rf node_modules/
  fi
  f_build        
fi



#------------
# Plugin-PostBuild
#------------







#------------
# Plugin-PreStart
#------------







#------------
# Plugin-Start
#------------





if [ "$TYPE_SOURCE_PHS" == "docker" ]; then
  #if [ -f ".phsPid" ] && [ "$(<.phsPid)" == "download" ]; then
  #  echo "node running but started from different source type"
  #  exit 1
  #fi
  if [ ! -f ".phsPid" ]; then
    
    if [ -n "$VERBOSE" ]; then echo "docker run --rm -d $dockerNodeExtRef -p 3000:3000   -v $(pwd):/home/node/exec_env -w /home/node/exec_env node:$TYPE_SOURCE_PHS_VERSION node  ./"; fi
    dockerContainerIDphs=$(docker run --rm -d $dockerNodeExtRef -p 3000:3000 \
          \
        -v "$(pwd)":/home/node/exec_env -w /home/node/exec_env node:$TYPE_SOURCE_PHS_VERSION node  ./)
    echo "$dockerContainerIDphs">.phsPid
  else
    dockerContainerIDphs=$(<.phsPid)
  fi
  tailCmd="docker logs -f $dockerContainerIDphs"
fi

if [ "$TYPE_SOURCE_PHS" == "local" ]; then
  #if [ -f ".phsPid" ]; then
  #  echo "node running but started from different source type"
  #  exit 1
  #fi
  if [ ! -f ".phsPid" ]; then
    cat <<-'    EOF' > localrun/noint.js
      process.on( "SIGINT", function() {} );
      require('../');
    EOF
    if [ -n "$VERBOSE" ]; then echo " node  localrun/noint.js >localrun/noint.out 2>&1 &"; fi
    
     node  localrun/noint.js >localrun/noint.out 2>&1 & 
    processIdphs=$!
    echo "$processIdphs">.phsPid
  else
    processIdphs=$(<.phsPid)
  fi
  tailCmd="tail -f localrun/noint.out"
fi





#------------
# Plugin-PostStart
#------------







#------------
# Plugin-LeaveComp
#------------








#------------
# WaitBuilder
#------------

# waiting for ctrl-c
if [ "$TAIL" == "YES" ]; then
  $tailCmd
else
  echo "$tailCmd"
  echo "<return> to rebuild, ctrl-c to stop redis, phs"
  while true; do
    read </dev/tty
    f_build
    f_deploy
  done
fi




